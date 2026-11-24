export interface ViewerWordingContext {
  /** The handle of the viewer, or null when the viewer has none */
  readonly handle: string | null;
}

interface GreetingWording {
  readonly title: string;
  readonly body: string;
}

/**
 * A function, because a wording may name a value of the moment, for example the
 * in-game year
 */
export type GreetingWordingFactory<Context> = (
  context: Context,
) => GreetingWording;

export type ViewerWordingFactory = GreetingWordingFactory<ViewerWordingContext>;

export const getGreetingName = ({ handle }: ViewerWordingContext) =>
  handle || "Citizen";

/**
 * At random on each render, thus the same wording can occur two times in
 * sequence
 */
export const pickRandomWording = <Context>(
  wordings: readonly GreetingWordingFactory<Context>[],
  context: Context,
): GreetingWording | null => {
  if (wordings.length === 0) return null;

  const index = Math.floor(Math.random() * wordings.length);

  return wordings[index]?.(context) ?? null;
};
