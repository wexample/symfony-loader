type OverlayDialogOptions = {
  setHidden?: boolean;
  exitOnClose?: boolean;
  onOpen?: () => void | Promise<void>;
  onClose?: () => void | Promise<void>;
};

export const applyOverlayDialogLifecycle = (
  target: any,
  options: OverlayDialogOptions = {}
): void => {
  const {
    setHidden = true,
    exitOnClose = true,
    onOpen,
    onClose,
  } = options;

  target.overlayOnOpen = async () => {
    if (setHidden) {
      target.el?.removeAttribute('hidden');
    }
    if (onOpen) {
      await onOpen();
    }
  };

  target.overlayOnClose = async () => {
    if (setHidden) {
      target.el?.setAttribute('hidden', 'hidden');
    }
    if (onClose) {
      await onClose();
    }
    if (exitOnClose) {
      await target.exit();
    }
  };
};
