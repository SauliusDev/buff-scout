import axios from 'axios';
import { getLogLevel } from '../core/logLevel.js';

const API_URL = 'https://buffscout.com';

// Check Steam login by fetching Steam community page directly
export async function checkSteamLogin() {
    try {
        const response = await fetch('https://steamcommunity.com/', {
            credentials: 'include',
            headers: {
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        const text = await response.text();
        
        // Check if user is logged in by looking for user info
        const steamUserInfoMatch = text.match(/data-userinfo="{(.*?)}"/);
        if (!steamUserInfoMatch) {
            return null;
        }

        // Convert HTML entities and create valid JSON
        const decodedString = decodeURIComponent(steamUserInfoMatch[1])
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&');
        const steamUserInfo = JSON.parse(`{${decodedString}}`);

        console.log('Parsed Steam user info from JSON:', steamUserInfo);

        // Parse avatar image and alt text - primary method
        const avatarMatch = text.match(/<img src="(https:\/\/avatars\.cloudflare\.steamstatic\.com\/[^"]+)" alt="([^"]+)">/);
        if (avatarMatch) {
            steamUserInfo.avatar_url = avatarMatch[1];
            steamUserInfo.display_name = avatarMatch[2];
            console.log('Found avatar and name via primary regex:', { avatar: avatarMatch[1], name: avatarMatch[2] });
        } else {
            // Fallback parsing method like Better Float
            try {
                const name = text
                    .substring(text.indexOf('data-miniprofile=') + 25)
                    .split('">')?.[1]
                    ?.split('</a>')?.[0];

                const avatar = text
                    .substring(text.indexOf('user_avatar') + 40)
                    .split('src="')?.[1]
                    ?.split('"')?.[0];

                if (avatar && avatar.startsWith('https://')) {
                    steamUserInfo.avatar_url = avatar;
                    console.log('Found avatar via fallback method:', avatar);
                }
                if (name) {
                    steamUserInfo.display_name = name;
                    console.log('Found name via fallback method:', name);
                }
            } catch (e) {
                console.error('Error in fallback avatar/name parsing:', e);
            }
        }

        // Additional fallback for avatar from JSON data if still missing
        if (!steamUserInfo.avatar_url && steamUserInfo.avatar) {
            steamUserInfo.avatar_url = steamUserInfo.avatar;
            console.log('Using avatar from JSON data:', steamUserInfo.avatar);
        }

        // Use personaname as fallback for display name
        const finalDisplayName = steamUserInfo.display_name || steamUserInfo.personaname || 'Unknown';
        const finalAvatar = steamUserInfo.avatar_url || '';

        const result = {
            logged_in: true,
            steam_id: steamUserInfo.steamid,
            username: finalDisplayName,
            display_name: finalDisplayName,
            personaname: steamUserInfo.personaname,
            avatar_url: finalAvatar,
            avatar: finalAvatar // Keep both field names for compatibility
        };

        console.log('Final Steam login result:', result);
        return result;
    } catch (error) {
        console.error('Error checking Steam login:', error);
        return null;
    }
}

export async function getSteamUserProfile() {
    const url = `${API_URL}/auth/profile`;
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console[getLogLevel(false)]('Error getting Steam user profile:', error);
        throw error;
    }
}