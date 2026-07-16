'use strict';

(() => {
  const ROOT_SELECTOR = '#vita-live-scene';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
  const DESKTOP_QUERY = '(min-width: 821px) and (hover: hover) and (pointer: fine)';
  const CONVERSATION_MIN_DELAY = 12000;
  const CONVERSATION_MAX_DELAY = 18000;
  const CONVERSATION_DURATION = 2600;

  const randomBetween = (minimum, maximum) => (
    Math.round(minimum + Math.random() * (maximum - minimum))
  );

  const createMotionController = (root) => {
    const patients = Array.from(root.querySelectorAll('.vita-live-scene-patient'));
    const notes = Array.from(root.querySelectorAll('.vita-live-scene-note'));
    const curves = Array.from(root.querySelectorAll('.vita-live-scene-curve'));
    const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
    const desktop = window.matchMedia(DESKTOP_QUERY);

    let conversationTimer = 0;
    let conversationEndTimer = 0;
    let mobileSequenceTimers = [];
    let mobileSequencePlayed = false;
    let viewportObserver = null;
    let activePatientIndex = -1;

    const clearTimer = (timer) => {
      if (timer) {
        window.clearTimeout(timer);
      }
    };

    const clearMobileSequence = () => {
      mobileSequenceTimers.forEach(window.clearTimeout);
      mobileSequenceTimers = [];
    };

    const clearConversation = () => {
      clearTimer(conversationEndTimer);
      conversationEndTimer = 0;
      notes.forEach((note) => note.classList.remove('is-conversation-active'));
      curves.forEach((curve) => curve.classList.remove('is-conversation-active'));
      root.classList.remove('has-conversation-activity');
    };

    const activateConversation = (patientIndex, duration = CONVERSATION_DURATION) => {
      if (reducedMotion.matches || notes.length === 0) {
        return;
      }

      clearConversation();
      const note = notes[patientIndex % notes.length];
      const curve = curves[patientIndex % Math.max(curves.length, 1)];

      root.classList.add('has-conversation-activity');
      note.classList.add('is-conversation-active');
      if (curve) {
        curve.classList.add('is-conversation-active');
      }

      conversationEndTimer = window.setTimeout(clearConversation, duration);
    };

    const scheduleConversation = () => {
      clearTimer(conversationTimer);
      conversationTimer = 0;

      if (reducedMotion.matches || !desktop.matches) {
        return;
      }

      conversationTimer = window.setTimeout(() => {
        activateConversation(randomBetween(0, patients.length - 1));
        scheduleConversation();
      }, randomBetween(CONVERSATION_MIN_DELAY, CONVERSATION_MAX_DELAY));
    };

    const setActivePatient = (index) => {
      if (activePatientIndex === index) {
        return;
      }

      patients.forEach((patient, patientIndex) => {
        patient.classList.toggle('is-desktop-nearest', patientIndex === index);
      });
      activePatientIndex = index;
    };

    const findNearestPatient = (event) => {
      let nearestIndex = -1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      patients.forEach((patient, index) => {
        const bounds = patient.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (bounds.left + bounds.width / 2),
          event.clientY - (bounds.top + bounds.height / 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });

      setActivePatient(nearestIndex);
    };

    const handlePointerEnter = (event) => {
      if (reducedMotion.matches || !desktop.matches) {
        return;
      }

      root.classList.add('is-desktop-present');
      findNearestPatient(event);
    };

    const handlePointerMove = (event) => {
      if (!root.classList.contains('is-desktop-present')) {
        return;
      }

      findNearestPatient(event);
    };

    const handlePointerLeave = () => {
      root.classList.remove('is-desktop-present');
      setActivePatient(-1);
    };

    const playMobileSequence = () => {
      if (mobileSequencePlayed || reducedMotion.matches || desktop.matches) {
        return;
      }

      mobileSequencePlayed = true;
      root.classList.add('is-mobile-sequencing');

      [0, 1, 2].forEach((noteIndex, step) => {
        mobileSequenceTimers.push(window.setTimeout(() => {
          activateConversation(noteIndex, 1500);
        }, step * 1800));
      });

      mobileSequenceTimers.push(window.setTimeout(() => {
        clearConversation();
        root.classList.remove('is-mobile-sequencing');
      }, 5400));
    };

    const configureViewportObserver = () => {
      if (viewportObserver) {
        viewportObserver.disconnect();
        viewportObserver = null;
      }

      if (reducedMotion.matches || desktop.matches || mobileSequencePlayed) {
        return;
      }

      viewportObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
          viewportObserver.disconnect();
          viewportObserver = null;
          playMobileSequence();
        }
      }, { threshold: [0.35] });

      viewportObserver.observe(root);
    };

    const syncMotionMode = () => {
      root.classList.toggle('is-reduced-motion', reducedMotion.matches);
      handlePointerLeave();
      clearConversation();
      clearMobileSequence();
      root.classList.remove('is-mobile-sequencing');
      clearTimer(conversationTimer);
      conversationTimer = 0;

      if (reducedMotion.matches) {
        if (viewportObserver) {
          viewportObserver.disconnect();
          viewportObserver = null;
        }
        return;
      }

      if (desktop.matches) {
        scheduleConversation();
      } else {
        configureViewportObserver();
      }
    };

    root.addEventListener('pointerenter', handlePointerEnter);
    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    root.addEventListener('pointerleave', handlePointerLeave);
    reducedMotion.addEventListener('change', syncMotionMode);
    desktop.addEventListener('change', syncMotionMode);

    root.classList.add('is-motion-ready');
    syncMotionMode();
  };

  const initialize = () => {
    const root = document.querySelector(ROOT_SELECTOR);

    if (!root || root.dataset.motionInitialized === 'true') {
      return;
    }

    root.dataset.motionInitialized = 'true';
    createMotionController(root);
    console.debug('vita-live-scene: Motion System preparado.');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
