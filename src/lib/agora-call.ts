'use client';

import type { IAgoraRTCClient, IAgoraRTCRemoteUser, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { api } from './api';

export interface RtcCredentials {
  appId: string;
  channel: string;
  token: string | null;
  uid: number;
}

export type CallState = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * Agent-side voice call in the browser (Agora Web SDK).
 * The SDK is loaded lazily so it never runs during server rendering.
 */
export class AgentCall {
  private client: IAgoraRTCClient | null = null;
  private mic: IMicrophoneAudioTrack | null = null;
  remoteUids = new Set<number>();
  onChange: () => void = () => {};

  async join(channel: string) {
    const creds = await api<RtcCredentials>('/calls/token', { query: { channel } });
    const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
    AgoraRTC.setLogLevel(3); // warnings and errors only
    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.client = client;

    client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video' | 'datachannel') => {
      if (mediaType !== 'audio') return; // agents use audio only
      await client.subscribe(user, mediaType);
      user.audioTrack?.play();
      this.remoteUids.add(Number(user.uid));
      this.onChange();
    });
    client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
      this.remoteUids.add(Number(user.uid));
      this.onChange();
    });
    client.on('user-left', (user: IAgoraRTCRemoteUser) => {
      this.remoteUids.delete(Number(user.uid));
      this.onChange();
    });

    await client.join(creds.appId, creds.channel, creds.token, creds.uid);
    this.mic = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true });
    await client.publish([this.mic]);
    this.onChange();
  }

  get muted() {
    return this.mic ? !this.mic.enabled : false;
  }

  async setMuted(muted: boolean) {
    await this.mic?.setEnabled(!muted);
    this.onChange();
  }

  async leave() {
    this.mic?.stop();
    this.mic?.close();
    this.mic = null;
    await this.client?.leave().catch(() => undefined);
    this.client = null;
    this.remoteUids.clear();
    this.onChange();
  }
}
