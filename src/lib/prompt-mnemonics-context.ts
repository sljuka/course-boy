import { createContext } from "react";

import type { CourseMnemonic } from "@/lib/mnemonics";

// Mnemonics to show in exercise prompts and hints (SLJ-37). Only the test
// player provides them, and only for a test the teacher allowed them in:
// elsewhere (and inside lessons) prompts stay plain, so a badge can't give an
// answer away. Each prompt counts its own "first N" places.
export const PromptMnemonicsContext = createContext<CourseMnemonic[]>([]);
