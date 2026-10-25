import { StatusBar } from "expo-status-bar";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Worklet } from "react-native-bare-kit";
import RPC from "bare-rpc";

// The worker bundle: the desktop app's workers/main.cjs, packed by bare-pack
// (npm run bundle:worker).
import bundle from "./worker/worker.bundle.mjs";

// Mobile spike (SLJ-20): the desktop app's P2P worker, unchanged, running on
// the phone through Bare Kit. Paste a course's code, import it over
// Hyperswarm, and read its first lesson.

// Must match workers/main.cjs (and electron/bare-worker.ts).
const CMD_IMPORT_COURSE = 3;

const toPath = (uri: string) => decodeURI(uri.replace(/^file:\/\//, "")).replace(/\/$/, "");

type Rpc = { request(command: number): { send(data: string): void; reply(encoding: string): Promise<string> } };

function startWorker(): Rpc {
  const root = toPath(Paths.document.uri);
  for (const name of ["p2p", "courses", "programs"]) new Directory(Paths.document, name).create({ idempotent: true });
  const worklet = new Worklet();
  worklet.start("/worker.bundle", bundle, ["--matko-worker", `${root}/p2p`]);
  // Bare Kit's IPC is a streamx Duplex; its typings differ from bare-stream's.
  return new RPC(worklet.IPC as unknown as ConstructorParameters<typeof RPC>[0], () => {}) as unknown as Rpc;
}

async function sendCommand<T>(rpc: Rpc, command: number, payload: unknown): Promise<T> {
  const request = rpc.request(command);
  request.send(JSON.stringify(payload));
  const result = JSON.parse((await request.reply("utf-8")) || "{}");
  if (result.error) throw new Error(result.error);
  return result as T;
}

type Lesson = { courseTitle: string; lessonTitle: string; text: string };

// The course's first lesson, from the files the worker wrote: the published
// version's folder (versions/<v>/ named by release.json) or the course's root.
function readFirstLesson(courseId: string): Lesson {
  const course = new Directory(Paths.document, "courses", courseId);
  const release = new File(course, "release.json");
  const version = release.exists ? JSON.parse(release.textSync()).publishedVersion : null;
  const base = version ? new Directory(course, "versions", version) : course;
  const manifest = JSON.parse(new File(base, "course.json").textSync());
  const locale = manifest.defaultLocale;
  for (const sectionId of manifest.sectionIds) {
    const section = JSON.parse(new File(base, sectionId, "section.json").textSync());
    const lessonId = section.lessonIds?.[0];
    if (!lessonId) continue;
    const lessonFile = new File(base, sectionId, "locales", locale, `${lessonId}.md`);
    const meta = JSON.parse(new File(base, sectionId, `${lessonId}.json`).textSync());
    return {
      courseTitle: manifest.locales[locale]?.title ?? courseId,
      lessonTitle: meta.locales?.[locale]?.title ?? lessonId,
      text: lessonFile.exists ? lessonFile.textSync().replace(/^\[matko-block\]: <> \(\w+\)\n/gm, "") : "",
    };
  }
  return { courseTitle: manifest.locales[locale]?.title ?? courseId, lessonTitle: "", text: "(no lessons)" };
}

export default function App() {
  const rpc = useRef<Rpc | null>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("Starting the P2P worker…");
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    try {
      rpc.current = startWorker();
      setStatus("Ready. Paste a course code.");
    } catch (error) {
      setStatus(`Worker failed: ${(error as Error).message}`);
    }
  }, []);

  async function importCourse() {
    if (!rpc.current) return;
    const driveKey = code.trim().replace(/^matko:\/\/import\//, "");
    setLesson(null);
    setStatus("Finding the course among peers and downloading it…");
    const started = Date.now();
    try {
      const root = toPath(Paths.document.uri);
      const result = await sendCommand<{ courseId: string }>(rpc.current, CMD_IMPORT_COURSE, {
        coursesRoot: `${root}/courses`,
        driveKey,
        programsRoot: `${root}/programs`,
        transferId: `spike-${started}`,
      });
      setLesson(readFirstLesson(result.courseId));
      setStatus(`Imported in ${Math.round((Date.now() - started) / 1000)} s.`);
    } catch (error) {
      setStatus(`Import failed: ${(error as Error).message}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Matko mobile spike</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setCode}
        placeholder="Course code"
        style={styles.input}
        value={code}
      />
      <Button disabled={!code.trim()} onPress={importCourse} title="Import" />
      <Text style={styles.status}>{status}</Text>
      {lesson && (
        <ScrollView style={styles.lesson}>
          <Text style={styles.courseTitle}>{lesson.courseTitle}</Text>
          <Text style={styles.lessonTitle}>{lesson.lessonTitle}</Text>
          <Text>{lesson.text}</Text>
        </ScrollView>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 12, padding: 16, paddingTop: 64 },
  courseTitle: { fontSize: 20, fontWeight: "600" },
  input: { borderColor: "#999", borderRadius: 8, borderWidth: 1, padding: 10 },
  lesson: { flex: 1 },
  lessonTitle: { fontSize: 16, fontWeight: "600", marginVertical: 8 },
  status: { color: "#555" },
  title: { fontSize: 22, fontWeight: "700" },
});
