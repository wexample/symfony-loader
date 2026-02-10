type OverlayDialogOptions = {
  setHiddenOnOpen?: boolean;
  setHiddenOnClose?: boolean;
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
    if (setHiddenOnClose) {
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
