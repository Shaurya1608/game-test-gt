/**
 * GamerThred Platform SDK v2.0
 * 
 * Industry-standard SDK for integrating HTML5 games with the GamerThred platform.
 * Supports local hosting and external remote game links.
 * 
 * @version 2.0.0
 * @license MIT
 */

"use strict";

(function (window) {
    if (window.GametSDK) {
        console.warn("[GamerThred] SDK already initialized.");
        return;
    }

    class GamerThredSDK {
        constructor() {
            this.version = "2.0.0";
            this.initialized = false;
            this.config = {
                debug: false
            };
            this.context = {
                gameId: null,
                mode: "fun",
                sessionId: null,
                reported: false,
                platformOrigin: null,
                securityToken: null
            };
            this.events = {};
            this._setupListeners();
            this._autoDetectHandshake();
        }

        /**
         * Initialize the SDK
         */
        init(gameId, config = {}) {
            if (this.initialized && this.context.gameId) return;
            
            this.context.gameId = gameId;
            this.config = { ...this.config, ...config };
            
            if (this.config.debug) {
                console.log(`[GamerThred] SDK v${this.version} Initialized for: ${gameId}`);
            }
        }

        /**
         * Report Game Start (Alias for matchStart)
         */
        reportGameStarted() {
            this._sendToPlatform("GAME_STARTED", {
                timestamp: Date.now()
            });
        }

        matchStart() {
            this.reportGameStarted();
        }

        /**
         * Report Live Score (Alias for addScore/updateScore)
         */
        reportScoreUpdate(score) {
            if (typeof score !== 'number') {
                console.error("[GamerThred] Score must be a number.");
                return;
            }
            this._sendToPlatform("SCORE_UPDATE", { score });
        }

        addScore(score) {
            this.reportScoreUpdate(score);
        }

        /**
         * Report Final Results (Alias for matchEnd)
         */
        reportGameOver(data) {
            if (this.context.reported) return;
            
            if (typeof data?.score !== 'number') {
                console.error("[GamerThred] Final score is required and must be a number.");
                return;
            }

            this.context.reported = true;
            this._sendToPlatform("GAME_OVER", {
                ...data,
                mode: this.context.mode,
                sessionId: this.context.sessionId
            });
        }

        matchEnd(data) {
            this.reportGameOver(data);
        }

        /**
         * Internal: Send message to platform
         */
        _sendToPlatform(type, payload) {
            if (!this.context.gameId) {
                console.error("[GamerThred] SDK not initialized. Call init(gameId) first.");
                return;
            }

            const target = window.parent || window.opener;
            if (!target || target === window) {
                if (this.config.debug) console.warn("[GamerThred] Standalone mode: Message suppressed.", { type, payload });
                return;
            }

            const message = {
                type,
                gameId: this.context.gameId,
                sessionId: this.context.sessionId,
                token: this.context.securityToken,
                ...payload
            };

            // Use postMessage with origin locking if available
            const origin = this.context.platformOrigin || "*";
            target.postMessage(message, origin);
        }

        /**
         * Internal: Setup platform listeners
         */
        _setupListeners() {
            window.addEventListener("message", (e) => {
                // Security: If we have a platform origin, only accept messages from it
                if (this.context.platformOrigin && e.origin !== this.context.platformOrigin) {
                    return;
                }

                const data = e.data;
                if (!data || !data.type) return;

                switch (data.type) {
                    case "INIT_GAME":
                        this.context.mode = data.mode || "fun";
                        this.context.sessionId = data.sessionId || null;
                        this.context.platformOrigin = e.origin;
                        this.initialized = true;
                        this._trigger("ready", data);
                        if (this.config.debug) console.log("[GamerThred] Platform Sync Complete.");
                        break;
                    
                    case "PLATFORM_EVENT":
                        this._trigger(data.event, data.payload);
                        break;
                }
            });
        }

        /**
         * Internal: Auto-detect security parameters from URL
         */
        _autoDetectHandshake() {
            try {
                const params = new URLSearchParams(window.location.search);
                const gtToken = params.get("gt_token");
                const gtOrigin = params.get("gt_origin");

                if (gtToken) this.context.securityToken = gtToken;
                if (gtOrigin) {
                    this.context.platformOrigin = gtOrigin;
                    if (this.config.debug) console.log(`[GamerThred] Remote Origin Locked: ${gtOrigin}`);
                }
            } catch (e) {
                // Fail silently
            }
        }

        /**
         * Event System
         */
        on(event, callback) {
            if (!this.events[event]) this.events[event] = [];
            this.events[event].push(callback);
        }

        _trigger(event, data) {
            if (this.events[event]) {
                this.events[event].forEach(cb => cb(data));
            }
        }
    }

    // Export singleton
    window.GametSDK = new GamerThredSDK();

})(window);
