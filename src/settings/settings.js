document.addEventListener("DOMContentLoaded", () => {
    const navButtons = document.querySelectorAll(".nav-item[data-section]");
    const sections = {
        general: document.getElementById("section-general"),
        account: document.getElementById("section-account"),
        license: document.getElementById("section-license"),
    };
    // Show only general tab on load
    Object.keys(sections).forEach(key => {
        if (sections[key]) {
            sections[key].style.display = key === 'general' ? 'block' : 'none';
        }
    });

    const licenseInput = document.getElementById("license-key");

    function isValidLicenseFormat(key) {
        return /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(key);
    }

    if (licenseInput) {
        licenseInput.addEventListener("input", () => {
            const key = licenseInput.value.trim();
            if (isValidLicenseFormat(key)) {
                licenseInput.style.backgroundColor = "#ebfbee"; // very slight greenish-blue
            } else {
                licenseInput.style.backgroundColor = ""; // reset
            }
        });
    }

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            navButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");

            Object.keys(sections).forEach((key) => {
                sections[key].style.display =
                    btn.dataset.section === key ? "block" : "none";
            });
        });
    });

    const resetLicenseBtn = document.getElementById("reset-license");
    if (resetLicenseBtn) {
        resetLicenseBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://buffscout.com/docs/troubleshooting/how-to-reset-license", "_blank");
        });
    }

    const activateLicenseBtn = document.getElementById("activate-license");

    // Add new function to check and update premium status
    async function checkAndUpdatePremiumStatus() {
        try {
            const authStatus = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "refreshAuthCheck" }, (response) => {
                    resolve(response?.success ? response : null);
                });
            });

            const steamStatus = document.getElementById("steam-status");
            const upgradePremiumBtn = document.getElementById("upgrade-premium-btn");
            
            if (authStatus && authStatus.plan === 'Pro') {
                // Update status text
                if (steamStatus) {
                    steamStatus.textContent = "Pro Account";
                    steamStatus.classList.add("premium");
                }
                
                // Handle upgrade button - add premium overlay
                if (upgradePremiumBtn) {
                    upgradePremiumBtn.classList.add("premium-disabled");
                    
                    // Add overlay if it doesn't exist
                    if (!upgradePremiumBtn.querySelector('.premium-overlay')) {
                        const overlay = document.createElement('div');
                        overlay.className = 'premium-overlay';
                        overlay.innerHTML = `
                            <div class="premium-overlay-content">
                                <img src="assets/dice_white_512.png" alt="Premium" width="20" height="20">
                                <div class="premium-overlay-text">
                                    <strong>You already have pro! Good luck scouting 🍀</strong>
                                </div>
                            </div>
                        `;
                        upgradePremiumBtn.appendChild(overlay);
                    }
                }
            } else {
                // Update status text
                if (steamStatus) {
                    steamStatus.textContent = "Free Account";
                    steamStatus.classList.remove("premium");
                }
                
                // Remove premium overlay from upgrade button
                if (upgradePremiumBtn) {
                    upgradePremiumBtn.classList.remove("premium-disabled");
                    const overlay = upgradePremiumBtn.querySelector('.premium-overlay');
                    if (overlay) {
                        overlay.remove();
                    }
                }
            }
        } catch (error) {
            console.error("Error checking premium status:", error);
            const steamStatus = document.getElementById("steam-status");
            if (steamStatus) {
                steamStatus.textContent = "Free Account";
                steamStatus.classList.remove("premium");
            }
        }
    }

    if (activateLicenseBtn) {
        activateLicenseBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const licenseKey = document.getElementById("license-key")?.value.trim();
            if (!licenseKey) {
                showNotification("License key is required.");
                return;
            }

            activateLicenseBtn.disabled = true;
            activateLicenseBtn.classList.add("loading");

            chrome.runtime.sendMessage({ action: "activateLicense", message: licenseKey }, async (response) => {
                const { success, message } = response || {};
                activateLicenseBtn.disabled = false;
                activateLicenseBtn.classList.remove("loading");

                if (success) {
                    showNotification(message, "Success!", "success");
                    
                    // Refetch premium status after successful activation
                    console.log("License activated successfully, refreshing premium status...");
                    await checkAndUpdatePremiumStatus();
                } else {
                    showNotification(message);
                }
            });
        });
    }

    const howToUseBtn = document.getElementById("how-to-use-btn");
    if (howToUseBtn) {
        howToUseBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://buffscout.com/docs", "_blank");
        });
    }

    const discordBtn = document.getElementById("discord-btn");
    if (discordBtn) {
        discordBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://discord.gg/BzQQYRQgGy", "_blank");
        });
    }

    // Steam authentication functionality
    const steamLoginBtn = document.getElementById("steam-login-btn");
    const steamLogoutBtn = document.getElementById("steam-logout-btn");
    const upgradePremiumBtn = document.getElementById("upgrade-premium-btn");
    const steamLoggedOutSection = document.getElementById("steam-logged-out");
    const steamLoggedInSection = document.getElementById("steam-logged-in");

    // Helper functions for persistent logout intent flag
    async function getSteamLogoutIntent() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "getSteamLogoutIntent" }, (response) => {
                resolve(response?.success ? response.message : false);
            });
        });
    }

    async function setSteamLogoutIntent(value) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "setSteamLogoutIntent", message: value }, (response) => {
                resolve(response);
            });
        });
    }

    async function clearSteamLogoutIntent() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "clearSteamLogoutIntent" }, (response) => {
                resolve(response);
            });
        });
    }

    // Add debugging helper functions to global scope for testing
    window.debugSteamAuth = async function() {
        console.log("=== Steam Auth Debug Info ===");
        
        // Check persistent logout intent flag
        const logoutIntent = await getSteamLogoutIntent();
        console.log("🚫 User logged out intentionally (from storage):", logoutIntent);
        
        // Check stored profile via background script
        const storedProfile = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "getSteamProfile" }, (response) => {
                resolve(response);
            });
        });
        console.log("Stored profile (via background):", storedProfile);

        // Check raw storage directly
        chrome.storage.local.get(['steamProfile'], function(result) {
            console.log("Raw storage result:", result);
        });

        // Permissions are now granted via manifest

        // Check current UI state
        const steamLoggedInSection = document.getElementById("steam-logged-in");
        const steamLoggedOutSection = document.getElementById("steam-logged-out");
        console.log("UI state - logged in visible:", steamLoggedInSection?.style.display !== "none");
        console.log("UI state - logged out visible:", steamLoggedOutSection?.style.display !== "none");
        
        console.log("=== End Debug Info ===");
    };

    window.forceClearSteam = async function() {
        console.log("=== Force clearing Steam profile ===");
        
        // Set persistent logout intent flag
        await setSteamLogoutIntent(true);
        console.log("🚫 Set logout intent flag");
        
        // Clear via background script
        await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "clearSteamProfile" }, (response) => {
                console.log("Clear result:", response);
                resolve(response);
            });
        });
        
        // Also clear directly from storage as backup
        chrome.storage.local.remove(['steamProfile'], function() {
            console.log("Direct storage clear completed");
            
            // Force UI update
            showSteamLoggedOut();
            
            console.log("Force clear completed - logout intent flag prevents auto-relogin");
        });
    };

    // Initialize Steam auth state
    initializeSteamAuth();
    
    // Check and update premium status on page load
    checkAndUpdatePremiumStatus();

    async function initializeSteamAuth() {
        console.log("=== Steam Auth Initialization Started ===");
        
        // Check persistent logout intent flag
        const userLoggedOutIntentionally = await getSteamLogoutIntent();
        console.log("User logged out intentionally (from storage):", userLoggedOutIntentionally);
        
        try {
            // First check if we have a stored Steam profile
            const steamProfile = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ action: "getSteamProfile" }, (response) => {
                    console.log("getSteamProfile response:", response);
                    resolve(response?.success ? response.message : null);
                });
            });

            console.log("Stored Steam profile check result:", steamProfile);

            if (steamProfile && steamProfile.steam_id) {
                console.log("Found valid stored Steam profile:", steamProfile);
                
                // Verify the stored profile is still valid by checking if user is still logged into Steam
                const currentSteamLogin = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: "checkSteamLogin" }, (response) => {
                        console.log("Verification - checkSteamLogin response:", response);
                        resolve(response?.success ? response.message : null);
                    });
                });
                
                if (currentSteamLogin && currentSteamLogin.logged_in && currentSteamLogin.steam_id === steamProfile.steam_id) {
                    console.log("Stored Steam profile is still valid");
                    updateSteamUI(steamProfile);
                    showSteamLoggedIn();
                    return;
                } else {
                    console.log("Stored Steam profile is no longer valid - user logged out or different user");
                    // Clear the invalid stored profile
                    await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: "clearSteamProfile" }, (response) => {
                            console.log("Cleared invalid Steam profile:", response);
                            resolve(response);
                        });
                    });
                }
            } else {
                console.log("No valid stored Steam profile found");
            }

            console.log("No stored Steam profile found, showing logged out state");
            
            console.log("Showing logged out state");
            showSteamLoggedOut();
        } catch (error) {
            console.error("Error initializing Steam auth:", error);
            showSteamLoggedOut();
        }
        
        console.log("=== Steam Auth Initialization Completed ===");
    }

    async function updateSteamUI(steamProfile) {
        console.log("Updating Steam UI with profile:", steamProfile);
        
        if (!steamProfile || !steamProfile.steam_id) {
            console.error("Invalid Steam profile data provided to updateSteamUI:", steamProfile);
            return;
        }
        
        const steamAvatar = document.getElementById("steam-avatar");
        const steamUsername = document.getElementById("steam-username");
        const steamId = document.getElementById("steam-id");

        // Try multiple field names for display name (Better Float compatibility)
        const displayName = steamProfile.username || 
                           steamProfile.display_name || 
                           steamProfile.personaname || 
                           "Unknown";
        
        // Try multiple field names for avatar URL  
        const avatarUrl = steamProfile.avatar_url || 
                         steamProfile.avatar || 
                         "";

        console.log("Extracted display name:", displayName);
        console.log("Extracted avatar URL:", avatarUrl);

        if (steamAvatar) {
            if (avatarUrl) {
                steamAvatar.src = avatarUrl;
                steamAvatar.alt = `${displayName} Avatar`;
                console.log("Set avatar src to:", avatarUrl);
            } else {
                console.warn("No avatar URL found, using fallback");
                steamAvatar.src = "assets/steam_logo_png.png";
                steamAvatar.alt = "Steam Avatar";
            }
            
            // Add error handling for broken images
            steamAvatar.onerror = function() {
                console.warn("Avatar image failed to load, using fallback");
                this.src = "assets/steam_logo_png.png";
                this.alt = "Steam Avatar";
            };
        }
        
        if (steamUsername) {
            steamUsername.textContent = displayName;
            console.log("Set username to:", displayName);
        }
        
        if (steamId) {
            steamId.textContent = `Steam ID: ${steamProfile.steam_id}`;
            console.log("Set Steam ID to:", steamProfile.steam_id);
        }
        
        // Use the new premium status function
        await checkAndUpdatePremiumStatus();
    }

    function showSteamLoggedIn() {
        if (steamLoggedOutSection) steamLoggedOutSection.style.display = "none";
        if (steamLoggedInSection) steamLoggedInSection.style.display = "block";
    }

    function showSteamLoggedOut() {
        if (steamLoggedOutSection) steamLoggedOutSection.style.display = "block";
        if (steamLoggedInSection) steamLoggedInSection.style.display = "none";
    }

    if (steamLoginBtn) {
        steamLoginBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            // Clear persistent logout intent flag since user is manually logging in
            await clearSteamLogoutIntent();
            console.log("✅ Cleared logout intent flag - user manually logging in");
            
            steamLoginBtn.disabled = true;
            steamLoginBtn.innerHTML = `<img src="assets/steam_logo_png.png" alt="Steam" width="20" height="20" style="filter: brightness(0) invert(1);"> Checking Steam...`;
            
            try {
                const steamLogin = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: "checkSteamLogin" }, (response) => {
                        resolve(response?.success ? response.message : null);
                    });
                });

                if (steamLogin && steamLogin.logged_in && steamLogin.steam_id) {
                    console.log("Steam login successful:", steamLogin);
                    
                    const profileData = {
                        steam_id: steamLogin.steam_id,
                        username: steamLogin.username || steamLogin.display_name,
                        display_name: steamLogin.display_name || steamLogin.username, 
                        personaname: steamLogin.personaname,
                        avatar_url: steamLogin.avatar_url,
                        avatar: steamLogin.avatar // Keep both field names for compatibility
                    };

                    console.log("Profile data to save:", profileData);

                    const buffScoutResponse = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ 
                            action: "steamSignInBuffScout", 
                            message: profileData
                        }, (response) => {
                            console.log("BuffScout Steam sign in response:", response);
                            resolve(response);
                        });
                    });

                    if (buffScoutResponse.success) {
                        console.log("BuffScout Steam sign in successful");
                        
                        // Update UI
                        updateSteamUI(profileData);
                        showSteamLoggedIn();
                        
                        // Clear any existing warning
                        const existingWarning = document.querySelector('.steam-login-warning');
                        if (existingWarning) {
                            existingWarning.remove();
                        }
                        
                        showNotification("Successfully signed in with Steam!", "Success!", "success");
                    } else if (buffScoutResponse.message.includes("Maximum number of devices")) {
                        showNotification("You have reached the maximum number of devices. Please remove one of your other devices from your account.", "Maximum number of devices", "info");
                    } else {
                        showNotification(buffScoutResponse.message, "Error", "error");
                    }
                } else {
                    showSteamLoginWarning();
                }
            } catch (error) {
                console.error("Error checking Steam login:", error);
                showNotification("Error checking Steam login. Please try again.", "Error", "error");
            } finally {
                // Always reset button state in case of any errors
                steamLoginBtn.disabled = false;
                steamLoginBtn.innerHTML = `<img src="assets/steam_logo_png.png" alt="Steam" width="20" height="20" style="filter: brightness(0) invert(1);"> Sign in with Steam`;
            }
        });
    }
    
    function showSteamLoginWarning() {
        // Remove any existing warning
        const existingWarning = document.querySelector('.steam-login-warning');
        if (existingWarning) {
            existingWarning.remove();
        }
        
        // Create and show warning box
        const warningBox = document.createElement('div');
        warningBox.className = 'steam-login-warning';
        warningBox.innerHTML = `
            <strong>Login to Steam to continue</strong>
            <p>Please log in to your Steam account in your browser first, then click the button again to sign in.</p>
        `;
        
        // Insert warning after the Steam login button
        const steamLoginBtn = document.getElementById("steam-login-btn");
        if (steamLoginBtn && steamLoginBtn.parentNode) {
            steamLoginBtn.parentNode.insertBefore(warningBox, steamLoginBtn.nextSibling);
        }
    }

    if (steamLogoutBtn) {
        steamLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            console.log("=== Steam Logout Started ===");
            
            try {
                // Set persistent logout intent flag to prevent auto-relogin
                await setSteamLogoutIntent(true);
                console.log("🚫 Set logout intent flag to prevent auto-relogin");
                
                // Clear the flag after 30 seconds to allow future auto-login
                setTimeout(async () => {
                    await clearSteamLogoutIntent();
                    console.log("⏰ Cleared logout intent flag - auto-login now allowed");
                }, 30000);

                // Sign out from BuffScout API first
                const buffScoutLogoutResult = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: "steamSignOutBuffScout" }, (response) => {
                        console.log("BuffScout Steam sign out response:", response);
                        resolve(response);
                    });
                });

                console.log("BuffScout Steam logout result:", buffScoutLogoutResult);

                // Verify the profile was actually cleared
                const verifyCleared = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({ action: "getSteamProfile" }, (response) => {
                        console.log("Verification - getSteamProfile after clear:", response);
                        resolve(response?.success ? response.message : null);
                    });
                });

                if (verifyCleared && verifyCleared.steam_id) {
                    console.error("WARNING: Steam profile was not properly cleared!", verifyCleared);
                    // Force clear again
                    await new Promise((resolve) => {
                        chrome.runtime.sendMessage({ action: "clearSteamProfile" }, (response) => {
                            console.log("Force clear Steam profile response:", response);
                            resolve(response);
                        });
                    });
                } else {
                    console.log("✅ Steam profile successfully cleared");
                }

                // Clear any existing warning
                const existingWarning = document.querySelector('.steam-login-warning');
                if (existingWarning) {
                    existingWarning.remove();
                }

                // Reset the sign in button state properly
                if (steamLoginBtn) {
                    steamLoginBtn.disabled = false;
                    steamLoginBtn.innerHTML = `<img src="assets/steam_logo_png.png" alt="Steam" width="20" height="20" style="filter: brightness(0) invert(1);"> Sign in with Steam`;
                }

                // Update UI immediately
                showSteamLoggedOut();
                
                showNotification("Successfully signed out from Steam!", "Success!", "success");
                console.log("=== Steam Logout Completed ===");
            } catch (error) {
                console.error("Error signing out from Steam:", error);
                showNotification("Failed to sign out. Please try again.");
            }
        });
    }

    if (upgradePremiumBtn) {
        upgradePremiumBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            window.open("https://buffscout.com/pricing", "_blank");
        });
    }

    function showNotification(message, title = "Uh oh! Something went wrong.", type = "error") {
        const container = document.getElementById("toast-container");

        // Remove excess toasts (keep max 3 visible)
        const existingToasts = Array.from(container.querySelectorAll(".toast"));
        if (existingToasts.length >= 3) {
            existingToasts.slice(0, existingToasts.length - 2).forEach(toast => removeToast(toast));
        }

        const toast = document.createElement("div");
        
        // Set toast type class
        const toastTypeClass = type === "success" ? "toast-success" : 
                              type === "info" ? "toast-info" : 
                              type === "warning" ? "toast-warning" : "toast-error";
        
        toast.className = `toast ${toastTypeClass}`;

        // Choose appropriate icon based on type
        let iconPath;
        if (type === "success") {
            iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>';
        } else if (type === "info") {
            iconPath = '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd"></path>';
        } else if (type === "warning") {
            iconPath = '<path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>';
        } else {
            iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"></path>';
        }

        toast.innerHTML = `
            <button class="toast-close" aria-label="Close" title="Close notification">×</button>
            <div class="toast-content">
                <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    ${iconPath}
                </svg>
                <div class="toast-text">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
            </div>
        `;

        container.appendChild(toast);

        // Add close button functionality
        const closeButton = toast.querySelector(".toast-close");
        closeButton.addEventListener("click", () => {
            removeToast(toast);
        });

        // Auto-dismiss after 2.5 seconds
        setTimeout(() => {
            removeToast(toast);
        }, 2500);

        function removeToast(toast) {
            if (!toast || !container.contains(toast)) return;
            
            toast.classList.add("toast-exit");
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
                
                // Remove blur when last toast is gone
                const layout = document.querySelector(".layout");
                if (!container.hasChildNodes() && layout) {
                    layout.classList.remove("blurred");
                }
            }, 300);
        }
    }
});