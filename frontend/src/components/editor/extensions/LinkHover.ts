import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const LinkHover = Extension.create({
  name: "linkHover",
  addProseMirrorPlugins() {
    let popover: HTMLDivElement | null = null;
    let hideTimer: any = null;

    const removePopover = () => {
      if (popover) {
        popover.remove();
        popover = null;
      }
    };

    const showPopover = (anchor: HTMLElement, href: string) => {
      removePopover();
      popover = document.createElement("div");
      popover.className =
        "fixed z-[100] px-2.5 py-1.5 rounded-md bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl text-[11px] text-neutral-200 max-w-[320px] truncate pointer-events-auto";
      popover.textContent = href;
      popover.style.left = `${anchor.getBoundingClientRect().left}px`;
      popover.style.top = `${anchor.getBoundingClientRect().bottom + 6}px`;
      popover.addEventListener("mouseenter", () => clearTimeout(hideTimer));
      popover.addEventListener("mouseleave", removePopover);
      document.body.appendChild(popover);
    };

    return [
      new Plugin({
        key: new PluginKey("link-hover"),
        view() {
          return {
            destroy() {
              removePopover();
            },
          };
        },
        props: {
          handleDOMEvents: {
            mouseover(view, e) {
              const target = (e.target as HTMLElement).closest("a");
              if (!target) return false;
              const href = target.getAttribute("href");
              if (!href) return false;
              clearTimeout(hideTimer);
              showPopover(target, href);
              return false;
            },
            mouseout(view, e) {
              const target = (e.target as HTMLElement).closest("a");
              if (!target) return false;
              clearTimeout(hideTimer);
              hideTimer = setTimeout(removePopover, 200);
              return false;
            },
          },
        },
      }),
    ];
  },
});
