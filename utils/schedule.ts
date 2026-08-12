/**
 * Handing control back mid-composition.
 *
 * The generators pause between sections so the progress bar can paint. A plain
 * timer is the wrong tool when the tab is in the background: browsers clamp
 * background timers to about a second, which turned a 250ms composition into a
 * six second one. Nothing is being painted then anyway, so the wait is skipped
 * in favour of a message-channel task, which is a real yield but unthrottled.
 */

let channel: MessageChannel | null = null;

function macrotask(): Promise<void> {
  if (typeof MessageChannel === 'undefined') return Promise.resolve();
  if (!channel) channel = new MessageChannel();
  return new Promise(resolve => {
    const port = channel!.port1;
    const done = () => {
      port.removeEventListener('message', done);
      resolve();
    };
    port.addEventListener('message', done);
    port.start();
    channel!.port2.postMessage(null);
  });
}

export function yieldToUi(): Promise<void> {
  // Off the browser entirely (tests): nothing to yield to
  if (typeof document === 'undefined') return Promise.resolve();
  if (document.hidden) return macrotask();
  return new Promise(resolve => setTimeout(resolve, 10));
}
