/**
 * Common shape of a game session. `frame(dt)` returns a view:
 * { state?, notice?, waiting?, connecting?, error? }.
 */
export class Session {
  constructor({ controllers, link = null, flip = false, myTeam = null, pausable = false }) {
    this.controllers = controllers;
    this.link = link;
    this.flip = flip;
    this.myTeam = myTeam;
    this.pausable = pausable;
  }

  dispose() {
    this.link?.close();
    this.controllers.forEach(c => c.dispose());
  }
}
