type OverlayDialogOptions = {
  setHiddenOnOpen?: boolean;
  setHiddenOnClose?: boolean;
  animateClose?: boolean;
  exitOnClose?: boolean;
  onOpen?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
};

export const applyOverlayDialogLifecycle = (
  target: any,
  options: OverlayDialogOptions = {}
): void => {
  const {
    setHiddenOnOpen = true,
    setHiddenOnClose = true,
    animateClose = false,
    exitOnClose = true,
    onOpen,
    onClose,
  } = options;

  target.overlayOnOpen = async () => {
    if (setHiddenOnOpen) {
      target.el?.removeAttribute('hidden');
    }
    if (onOpen) {
      await onOpen();
    }
  };

  target.overlayOnClose = async () => {
    if (!animateClose) {
      if (setHiddenOnClose) {
        target.el?.setAttribute('hidden', 'hidden');
      }
      if (onClose) {
        await onClose();
      }
      if (exitOnClose) {
        await target.exit();
      }
    }
  };

  if (animateClose) {
    target.overlayClose = async (event?: Event) => {
      if (!target.overlayIsOpen?.()) {
        return;
      }

      if (target.fadeAnimationClosing) {
        return;
      }

      if (onClose) {
        await onClose();
      }

      target.app.services.overlay.clearActive(target);
      await target.exit();
    };
  }
};
