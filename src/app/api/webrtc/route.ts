import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple WebRTC signaling endpoint
 * In production, use WebSocket for real-time signaling
 */

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  peerId: string;
}

// In-memory store (use Redis in production)
const signalingStore = new Map<string, SignalingMessage[]>();

/**
 * POST /api/webrtc
 * Send signaling message
 */
export async function POST(request: NextRequest) {
  try {
    const message: SignalingMessage = await request.json();
    
    if (!message.type || !message.peerId) {
      return NextResponse.json(
        { error: 'Invalid signaling message' },
        { status: 400 }
      );
    }
    
    // Store message for peer
    const messages = signalingStore.get(message.peerId) || [];
    messages.push(message);
    signalingStore.set(message.peerId, messages);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process signaling message' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webrtc?peerId=xxx
 * Retrieve signaling messages for peer
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const peerId = searchParams.get('peerId');
  
  if (!peerId) {
    return NextResponse.json(
      { error: 'peerId required' },
      { status: 400 }
    );
  }
  
  const messages = signalingStore.get(peerId) || [];
  signalingStore.delete(peerId); // Clear after retrieval
  
  return NextResponse.json({ messages });
}
