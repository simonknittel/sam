import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  readonly pipWindow: Window;
  readonly children: ReactNode;
}

export const OverlayWindow = ({ pipWindow, children }: Props) => {
  return createPortal(children, pipWindow.document.body);
};
