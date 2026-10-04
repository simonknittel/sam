import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The texts of the live region of dnd-kit (see `useSortableList` in the
 * app). They tell screen readers each step of a drag.
 */
export const dragNarration = async (page: Page) =>
  (await page.getByRole("status").allTextContents()).join(" ");

/**
 * dnd-kit marks the handle of the entry that the user drags as pressed. The
 * mark is the same for the keyboard, the mouse and the touch.
 */
const expectDragging = (handle: Locator) =>
  expect(handle).toHaveAttribute("aria-pressed", "true");

const expectDropped = (handle: Locator) =>
  expect(handle).not.toHaveAttribute("aria-pressed");

/**
 * The pointer must move some pixels before dnd-kit starts a drag (8 in the
 * app). This move is larger, thus the drag starts before the pointer goes to
 * the target.
 */
const ACTIVATION_MOVE = 20;

const boundingBoxOf = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error("The element has no bounding box");
  return box;
};

/**
 * Moves the entry of the handle one position down, as a keyboard user does:
 * the space bar picks it up, the arrow key moves it, and the space bar drops
 * it. Each key waits until dnd-kit processed the previous key. A key before
 * that does not move the entry, which no real keyboard user could do.
 */
export const sortByKeyboard = async (handle: Locator) => {
  const page = handle.page();
  await handle.focus();

  await page.keyboard.press("Space");
  await expectDragging(handle);
  const afterPickup = await dragNarration(page);

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => dragNarration(page)).not.toBe(afterPickup);

  await page.keyboard.press("Space");
  await expectDropped(handle);
};

/**
 * Drags the entry of the source handle with the mouse to the far edge of the
 * target handle, thus the entry moves past the target. `whileDragging` runs
 * before the drop.
 */
export const sortByMouse = async (
  source: Locator,
  target: Locator,
  whileDragging?: () => Promise<void>,
) => {
  const page = source.page();
  const sourceBox = await boundingBoxOf(source);
  const targetBox = await boundingBoxOf(target);
  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const isDownward = targetBox.y > sourceBox.y;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(
    startX,
    startY + (isDownward ? ACTIVATION_MOVE : -ACTIVATION_MOVE),
    { steps: 5 },
  );
  await expectDragging(source);

  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    isDownward ? targetBox.y + targetBox.height : targetBox.y,
    { steps: 10 },
  );
  await whileDragging?.();

  await page.mouse.up();
  await expectDropped(source);
};

/**
 * The same move as `sortByMouse` with a finger. Playwright has no touch
 * drag, thus the gesture goes through the Chrome DevTools Protocol. If the
 * browser scrolls the page instead, it cancels the drag and the order does
 * not change.
 */
export const sortByTouch = async (source: Locator, target: Locator) => {
  const page = source.page();
  const sourceBox = await boundingBoxOf(source);
  const targetBox = await boundingBoxOf(target);
  const pointerX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endY =
    targetBox.y > sourceBox.y ? targetBox.y + targetBox.height : targetBox.y;

  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: pointerX, y: startY }],
    });
    const stepCount = 10;
    for (let step = 1; step <= stepCount; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: pointerX, y: startY + ((endY - startY) * step) / stepCount },
        ],
      });
    }
    await expectDragging(source);

    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expectDropped(source);
  } finally {
    await session.detach();
  }
};
