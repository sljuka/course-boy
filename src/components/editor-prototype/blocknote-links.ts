import { isAppLink } from "@/lib/app-links";

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
