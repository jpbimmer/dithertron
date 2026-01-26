import { AnimationState, GifFrameData, ProcessedFrame } from '../common/types';

export type FrameUpdateCallback = (frameIndex: number, frame: ProcessedFrame) => void;
export type ProgressCallback = (progress: number, currentFrame: number, totalFrames: number) => void;
export type PlaybackCallback = (frameIndex: number) => void;

export class AnimationStateManager {
    private state: AnimationState;
    private playbackTimer: number | null = null;
    private frameStartTime: number = 0;
    private onFrameUpdate: FrameUpdateCallback | null = null;
    private onProgress: ProgressCallback | null = null;
    private onPlayback: PlaybackCallback | null = null;

    constructor() {
        this.state = this.createEmptyState();
    }

    private createEmptyState(): AnimationState {
        return {
            frames: [],
            processedFrames: [],
            currentFrameIndex: 0,
            isAnimated: false,
            isPlaying: false,
            isProcessing: false,
            processingProgress: 0
        };
    }

    reset(): void {
        this.stopPlayback();
        this.state = this.createEmptyState();
    }

    setSourceFrames(frames: GifFrameData[]): void {
        this.stopPlayback();
        this.state = {
            ...this.createEmptyState(),
            frames,
            isAnimated: frames.length > 1
        };
    }

    getState(): Readonly<AnimationState> {
        return this.state;
    }

    isAnimated(): boolean {
        return this.state.isAnimated;
    }

    isPlaying(): boolean {
        return this.state.isPlaying;
    }

    isProcessing(): boolean {
        return this.state.isProcessing;
    }

    getFrameCount(): number {
        return this.state.frames.length;
    }

    getProcessedFrameCount(): number {
        return this.state.processedFrames.length;
    }

    getCurrentFrameIndex(): number {
        return this.state.currentFrameIndex;
    }

    getSourceFrame(index: number): GifFrameData | null {
        if (index < 0 || index >= this.state.frames.length) return null;
        return this.state.frames[index];
    }

    getProcessedFrame(index: number): ProcessedFrame | null {
        if (index < 0 || index >= this.state.processedFrames.length) return null;
        return this.state.processedFrames[index];
    }

    getCurrentProcessedFrame(): ProcessedFrame | null {
        return this.getProcessedFrame(this.state.currentFrameIndex);
    }

    getAllProcessedFrames(): ProcessedFrame[] {
        return [...this.state.processedFrames];
    }

    // Processing methods
    startProcessing(): void {
        this.state.isProcessing = true;
        this.state.processingProgress = 0;
        this.state.processedFrames = [];
    }

    addProcessedFrame(frame: ProcessedFrame): void {
        this.state.processedFrames.push(frame);
        this.state.processingProgress = this.state.processedFrames.length / this.state.frames.length;

        if (this.onProgress) {
            this.onProgress(
                this.state.processingProgress,
                this.state.processedFrames.length,
                this.state.frames.length
            );
        }

        if (this.onFrameUpdate) {
            this.onFrameUpdate(this.state.processedFrames.length - 1, frame);
        }
    }

    finishProcessing(): void {
        this.state.isProcessing = false;
        this.state.processingProgress = 1;
    }

    clearProcessedFrames(): void {
        this.state.processedFrames = [];
        this.state.processingProgress = 0;
    }

    // Playback methods
    setCallbacks(
        onFrameUpdate: FrameUpdateCallback | null,
        onProgress: ProgressCallback | null,
        onPlayback: PlaybackCallback | null
    ): void {
        this.onFrameUpdate = onFrameUpdate;
        this.onProgress = onProgress;
        this.onPlayback = onPlayback;
    }

    seekToFrame(index: number): void {
        if (index < 0) index = 0;
        if (index >= this.state.processedFrames.length) {
            index = this.state.processedFrames.length - 1;
        }
        if (index < 0) index = 0;

        this.state.currentFrameIndex = index;

        if (this.onPlayback) {
            this.onPlayback(index);
        }
    }

    play(): void {
        if (!this.state.isAnimated || this.state.processedFrames.length === 0) return;
        if (this.state.isPlaying) return;

        this.state.isPlaying = true;
        this.frameStartTime = performance.now();
        this.scheduleNextFrame();
    }

    pause(): void {
        this.state.isPlaying = false;
        if (this.playbackTimer !== null) {
            clearTimeout(this.playbackTimer);
            this.playbackTimer = null;
        }
    }

    togglePlayback(): boolean {
        if (this.state.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.state.isPlaying;
    }

    stopPlayback(): void {
        this.pause();
        this.state.currentFrameIndex = 0;
    }

    private scheduleNextFrame(): void {
        if (!this.state.isPlaying) return;

        const currentFrame = this.state.processedFrames[this.state.currentFrameIndex];
        if (!currentFrame) {
            this.pause();
            return;
        }

        const delay = currentFrame.delay || 100;
        const elapsed = performance.now() - this.frameStartTime;
        const remainingDelay = Math.max(0, delay - elapsed);

        this.playbackTimer = window.setTimeout(() => {
            this.advanceFrame();
        }, remainingDelay);
    }

    private advanceFrame(): void {
        if (!this.state.isPlaying) return;

        // Move to next frame (loop to beginning if at end)
        let nextIndex = this.state.currentFrameIndex + 1;
        if (nextIndex >= this.state.processedFrames.length) {
            nextIndex = 0;
        }

        this.state.currentFrameIndex = nextIndex;
        this.frameStartTime = performance.now();

        if (this.onPlayback) {
            this.onPlayback(nextIndex);
        }

        this.scheduleNextFrame();
    }
}

// Singleton instance for the application
export const animationState = new AnimationStateManager();
