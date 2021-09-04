import WebSocket from 'isomorphic-ws';
import { EventHandler, IEventHandler } from './event-handler';
import {
  CheerEvent,
  FollowEvent,
  RaidEvent,
  SubscribeEvent,
  TauEvent,
  UpdateEvent,
} from './events';

export class TauClient {
  private ws: WebSocket;
  private apiToken: string;

  private debug = false;

  private readonly _follows = new EventHandler<FollowEvent>();
  private readonly _streamUpdates = new EventHandler<UpdateEvent>();
  // TODO point redemption. cannot test because one field cannot be set in the test
  private readonly _cheers = new EventHandler<CheerEvent>();
  private readonly _raids = new EventHandler<RaidEvent>();
  private readonly _subscribes = new EventHandler<SubscribeEvent>();
  private readonly _unknownEvents = new EventHandler<unknown>();

  // ugly double definition to minimize typings visible to end user
  public readonly follows: IEventHandler<FollowEvent> = this._follows;
  public readonly cheers: IEventHandler<CheerEvent> = this._cheers;
  public readonly streamUpdates: IEventHandler<UpdateEvent> =
    this._streamUpdates;
  public readonly raids: IEventHandler<RaidEvent> = this._raids;
  public readonly subscribes: IEventHandler<SubscribeEvent> = this._subscribes;
  public readonly unknownEvents: IEventHandler<unknown> = this._unknownEvents;

  constructor(url: string, tauApiToken: string, debug = false) {
    this.ws = new WebSocket(url);
    this.apiToken = tauApiToken;
    this.debug = debug;
  }

  public connect() {
    this.ws.onopen = () => {
      console.log('TAU: connected');
      this.ws.send(JSON.stringify({ token: this.apiToken }));
    };

    this.ws.onclose = () => {
      console.log('TAU: disconnected');
    };

    this.ws.onmessage = (message) => {
      this.debug && console.log('TAU: message received');
      if (typeof message.data !== 'string') {
        console.warn(
          `TAU: websocket received unexpected message data. Expected string. Found ${typeof message.data}`
        );
        return;
      }
      const event: TauEvent = JSON.parse(message.data);
      this.demultiplex(event);
    };
  }

  public close() {
    this.ws.close();
  }

  private demultiplex(event: TauEvent) {
    this.debug && console.log('TAU: received event type:', event.event_type);
    switch (event.event_type) {
      case 'follow':
        return this._follows._invoke(event);
      case 'update':
        return this._streamUpdates._invoke(event);
      case 'cheer':
        return this._cheers._invoke(event);
      case 'raid':
        return this._raids._invoke(event);
      case 'subscribe':
        return this._subscribes._invoke(event);
      default:
        return this._unknownEvents._invoke(event);
    }
  }
}

// Necessary to make TauClient work in the browser.
if (typeof window !== 'undefined') {
  (window as any).TauClient = TauClient;
}
