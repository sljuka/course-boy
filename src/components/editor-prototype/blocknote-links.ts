import { VALID_LINK_PROTOCOLS } from "@blocknote/core/extensions";

import { isAppLink } from "@/lib/app-links";

// BlockNote's link field (the link button, ⌘K, and editing a link from its
// toolbar) puts `https://` in front of any link whose protocol isn't in this
// list, which turned `matko://lesson/…` into `https://matko://lesson/…`, a
// web link that opened the browser. The list is BlockNote's own, shared by
// its React components, so `matko` is added to it once, here.
if (!VALID_LINK_PROTOCOLS.includes("matko")) {
  VALID_LINK_PROTOCOLS.push("matko");
}

// Links the link field broke before that (`https://matko://…`), mended when a
// lesson is read, so they open in the app again and are saved right with the
// next edit.
export function repairAppLinks(markdown: string): string {
  return markdown.replace(/\bhttps?:\/\/(?=matko:\/\/)/gi, "");
}

// BlockNote's own rule for which links a document keeps (`isAllowedUri` in
// @blocknote/core, copied: its types export it, but the installed version
// doesn't): http(s), mailto and the like, or a relative link. Anything else
// is dropped when a lesson is read or a link is pasted.
const ALLOWED_URI =
  /^(?:(?:http|https|ftp|ftps|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z0-9+.-]+(?:[^a-z+.\-:]|$))/i;
// A link with its whitespace and invisible characters taken out, as
// BlockNote checks it: control characters and spaces of every kind.
function withoutSpaces(href: string): string {
  return Array.from(href)
    .filter((character) => character.charCodeAt(0) > 0x20 && !/[\s\u180E]/.test(character))
    .join("");
}

// Every editor that shows a lesson passes this, so links to course content
// (`matko://…`, SLJ-60) are kept like web links: the player, the lesson
// editor, and the Markdown conversion.
export const blockNoteLinkOptions = {
  isValidLink: (href: string) => ALLOWED_URI.test(withoutSpaces(href)) || isAppLink(href),
};
