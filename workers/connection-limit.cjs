// At most this many connections per computer, for every course it shares
// together (all of a computer's courses use one swarm).
//
// Hyperswarm limits only the connections a computer opens itself (`maxPeers`,
// 64); the ones it accepts have no limit (`maxServerConnections` is stored but
// never checked in hyperswarm 4.17). A teacher with a popular course, or a
// student sharing it on, would accept everyone who finds them: hundreds of
// connections, each costing memory, CPU and upload. Measured with
// scripts/measure-peers.mjs (docs/pear-integration-notes.md, "Peers online"):
// with 400 students online the teacher held 181 connections and each student
// about 115.
//
// 256 is far above a class or a school, so normally nothing is refused, and
// low enough for an ordinary laptop. A computer that is full refuses new
// connections at the handshake; whoever it refuses gets the course from the
// other students who have it. The limit counts every course together, so a
// popular course that fills it can keep out someone looking for a rarer one
// nobody else shares at the moment: keeping room for rare courses would be
// the next step if that happens.
const MAX_CONNECTIONS = 256

// Hyperswarm's `firewall` option: refuses a peer while `swarm` holds `max`
// connections, except peers `isVetted` (invite-only courses' students, who
// get no course from the public swarm). Wire it with `limitConnections`.
function connectionFirewall({ getSwarm, isVetted = () => false, max = MAX_CONNECTIONS }) {
  return (remotePublicKey) => {
    const swarm = getSwarm()
    if (!swarm || swarm.connections.size < max) return false
    return !isVetted(remotePublicKey)
  }
}

// Hyperswarm bans a peer its firewall refused, for as long as the swarm runs,
// and a banned peer is never connected to again, in either direction. A peer
// refused for being one too many must be welcome once there's room, so the
// ban is lifted as soon as it's made: the connection is still refused.
function liftFullBans(swarm) {
  swarm.on('ban', (peerInfo, error) => {
    if (error?.message === 'Peer is firewalled') peerInfo.ban(false)
  })
}

// Options for `new Hyperswarm(...)` that limit its connections, and a
// function to call with the swarm once it's made.
function limitConnections({ isVetted, max = MAX_CONNECTIONS } = {}) {
  let swarm = null
  return {
    attach(created) {
      swarm = created
      liftFullBans(created)
      return created
    },
    firewall: connectionFirewall({ getSwarm: () => swarm, isVetted, max }),
  }
}

module.exports = { MAX_CONNECTIONS, connectionFirewall, limitConnections, liftFullBans }
