// Phase 0 spike: proves Electron's main process and a Bare child process can
// exchange bytes at all. Not the real worker body — see docs/pear-integration-notes.md.
// Run by the Bare runtime, not Node; resolves node_modules the same way Node does.
const Pipe = require('bare-pipe')
const FramedStream = require('framed-stream')

const stream = new FramedStream(new Pipe(3))

stream.on('data', (message) => {
  if (message.toString() === 'ping') {
    stream.write('pong')
  }
})
