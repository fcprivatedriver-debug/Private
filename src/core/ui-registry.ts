/**
 * UI registry — ecrãs registados por módulos sem lógica nas app routes.
 */
import type { ComponentType } from "react";

export type UiViewId = "calendar.agenda";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = Record<string, any>;

const views = new Map<UiViewId, ComponentType<AnyProps>>();

export function registerUiView<P extends AnyProps>(
  id: UiViewId,
  component: ComponentType<P>,
): void {
  views.set(id, component as ComponentType<AnyProps>);
}

export function getUiView(id: UiViewId): ComponentType<AnyProps> | null {
  return views.get(id) ?? null;
}
