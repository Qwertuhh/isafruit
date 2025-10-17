/**
 * WebRTC Client for video streaming
 */

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private peerId: string;
  private onTrackCallback?: (stream: MediaStream) => void;

  constructor(peerId?: string) {
    this.peerId = peerId || this.generatePeerId();
  }

  private generatePeerId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize peer connection
   */
  async initialize(stream: MediaStream): Promise<void> {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    stream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, stream);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignalingMessage({
          type: 'ice-candidate',
          payload: event.candidate,
          peerId: this.peerId,
        });
      }
    };

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      if (this.onTrackCallback && event.streams[0]) {
        this.onTrackCallback(event.streams[0]);
      }
    };
  }

  /**
   * Create and send offer
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.sendSignalingMessage({
      type: 'offer',
      payload: offer,
      peerId: this.peerId,
    });

    return offer;
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Send signaling message to server
   */
  private async sendSignalingMessage(message: unknown): Promise<void> {
    try {
      await fetch('/api/webrtc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Failed to send signaling message:', error);
    }
  }

  /**
   * Poll for signaling messages
   */
  async pollSignalingMessages(): Promise<void> {
    try {
      const response = await fetch(`/api/webrtc?peerId=${this.peerId}`);
      const data = await response.json();

      for (const message of data.messages || []) {
        if (message.type === 'answer') {
          await this.handleAnswer(message.payload);
        } else if (message.type === 'ice-candidate') {
          await this.handleIceCandidate(message.payload);
        }
      }
    } catch (error) {
      console.error('Failed to poll signaling messages:', error);
    }
  }

  /**
   * Set callback for incoming tracks
   */
  onTrack(callback: (stream: MediaStream) => void): void {
    this.onTrackCallback = callback;
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  getPeerId(): string {
    return this.peerId;
  }
}
