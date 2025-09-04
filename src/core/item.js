import { getLogLevel } from '../core/logLevel.js';

const agentNames = [
    "Number K",
    "Sir Bloody Miami Darryl",
    "Sir Bloody Darryl Royale",
    "Special Agent Ava",
    "'The Doctor' Romanov",
    "Lt. Commander Ricksaw",
    "Sir Bloody Skullhead Darryl",
    "Bloody Darryl The Strapped",
    "Operator",
    "Sir Bloody Silent Darryl",
    "Getaway Sally",
    "Safecracker Voltzmann",
    "Michael Syfers",
    "3rd Commando Company",
    "Sir Bloody Loudmouth Darryl",
    "Ground Rebel",
    "Elite Trapper Solman",
    "Cmdr. Frank 'Wet Sox' Baroud",
    "Markus Delrow",
    "Vypa Sista of the Revolution",
    "The Elite Mr. Muhlik",
    "Seal Team 6 Soldier",
    "Primeiro Tenente",
    "Blackwolf",
    "Osiris",
    "Rezan The Ready",
    "Little Kev",
    "B Squadron Officer",
    "Chem-Haz Capitaine",
    "Buckshot",
    "'Two Times' McCoy",
    "Maximus",
    "Lieutenant Rex Krikey",
    "Prof. Shahmat",
    "'Medium Rare' Crasswater",
    "Cmdr. Mae 'Dead Cold' Jamison",
    "Enforcer",
    "D Squadron Officer",
    "Dragomir",
    "Trapper Aggressor",
    "Arno The Overgrown",
    "1st Lieutenant Farlow",
    "Chef d'Escadron Rouchard",
    "Chem-Haz Specialist",
    "Soldier",
    "Trapper",
    "Slingshot",
    "Cmdr. Davida 'Goggles' Fernandez",
    // More my added agents
    "Street Soldier"
];

// Helper to escape regex special characters in agent names
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Prefix matcher: name must start with one of the agent names and be followed by end or a pipe
const agentPrefixRegex = new RegExp(
    `^(${agentNames.map(escapeRegExp).join('|')})(\\s*\\|\\s*|$)`
);

export class Item {
    constructor(
        cardQuality, // e.g. Factory New, Minimal Wear, Field-Tested, Well-Worn, Battle-Scarred
        cardFloat, // e.g. 0.00000000
        cardItemType, // e.g. AK-47, AWP, M4A4, M4A1-S, USP-S, Glock-18, etc.
        cardItemName, // e.g. Asiimov, Hyper Beast, Dragon Lore, etc.
        currencyValue, // e.g. 0.00
        currencyValueMarketplace, // e.g. 0.00 (renamed from currencyValueBuff)
        priceDifference, // e.g. +0.00%
        phase, // e.g. Phase 1, Phase 2, Phase 3, Phase 4, Doppler, Gamma Doppler, Emerald, Black Pearl, Ruby, Sapphire
        site, // e.g. csgoempire, csgoroll, csfloat
        count // e.g. 0 (supply count)
    ) {
        this._cardQuality = cardQuality;
        this._cardFloat = cardFloat;
        this._cardItemType = cardItemType;
        this._cardItemName = cardItemName;
        this._currencyValue = currencyValue;
        this._currencyValueMarketplace = currencyValueMarketplace;
        this._priceDifference = priceDifference;
        this._phase = phase;
        this._site = site;
        this._count = count;
    }

    get cardQuality() { return this._cardQuality; }
    get cardFloat() { return this._cardFloat; }
    get cardItemType() { return this._cardItemType; }
    get cardItemName() { return this._cardItemName; }
    get currencyValue() { return this._currencyValue; }
    get currencyValueMarketplace() { return this._currencyValueMarketplace; }
    get priceDifference() { return this._priceDifference; }
    get phase() { return this._phase; }
    get site() { return this._site; }
    get count() { return this._count; }

    set cardQuality(value) { this._cardQuality = value; }
    set cardFloat(value) { this._cardFloat = value; }
    set cardItemType(value) { this._cardItemType = value; }
    set cardItemName(value) { this._cardItemName = value; }
    set currencyValue(value) { this._currencyValue = value; }
    set currencyValueMarketplace(value) { this._currencyValueMarketplace = value; }
    set priceDifference(value) { this._priceDifference = value; }
    set phase(value) { this._phase = value; }
    set site(value) { this._site = value; }
    set count(value) { this._count = value; }

    isEqual(otherItem) {
        return this._cardQuality === otherItem.cardQuality &&
               this._cardFloat === otherItem.cardFloat &&
               this._cardItemType === otherItem.cardItemType &&
               this._cardItemName === otherItem.cardItemName &&
               this._currencyValue === otherItem.currencyValue;
    }

    // is used to get item data from price json
    getFormattedName() {
        if (this._site === 'csgoroll') {
            //  for normal skins
            if (this.isNotPainted()) {
                return this._cardItemType;
            }
            // for sticker
            if (this.isSticker()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for agent
            if (this.isAgentRoll()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for case
            if (this.isCaseRoll()) {
                return this._cardItemType; 
            }
            // for graffiti
            if (this.isGraffitiRoll()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for pin
            if (this.isPinRoll()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for charm
            if (this.isCharmRoll()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for capsule
            if (this.isCapsuleRoll()) {
                return `${this._cardItemName}`;
            }
            // for pass
            if (this.isPassRoll()) {
                return `${this._cardItemType}`;
            }
            // for phases 
            if (this.isSpecialPhase()) {
                return `${this._cardItemType} | ${this._cardItemName} (${this._cardQuality}) - ${this._phase}`;
            }
            // for music kit
            if (this.isMusicKitRoll()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for all other default gun skins
            else {
                return `${this._cardItemType} | ${this._cardItemName} (${this._cardQuality})`;
            }
        } else if (this._site === 'csgoempire') {
            //  for normal skins
            if (this.isNotPainted()) {
                return this._cardItemType;
            }
            // for sticker
            if (this.isSticker()) {
                // csgoempire stickers format names as "<Team> - <Event>", quality should be in parentheses after team
                const name = this._cardItemName || "";
                const parts = name.split(/\s[-–]\s/); // split on hyphen or en dash surrounded by spaces
                const qualityPart = this._cardQuality ? ` (${this._cardQuality})` : "";
                if (parts.length === 2) {
                    const [team, event] = parts;
                    return `${this._cardItemType} | ${team}${qualityPart} | ${event}`;
                }
                // fallback if unexpected format
                return `${this._cardItemType} | ${name}${qualityPart}`;
            }
            // for agent
            if (this.isAgentEmpire()) {
                return `${this._cardItemName}`;
            }
            // for case
            if (this.isCaseEmpire()) {
                return this._cardItemName; 
            }
            // for graffiti
            if (this.isGraffitiEmpire()) {
                return `${this._cardItemType} | ${this._cardItemName} (${this._cardQuality})`;
            }
            // for pinimage.png
            if (this.isPinEmpire()) {
                return `${this._cardItemName}`;
            }
            // for charm
            if (this.isCharmEmpire()) {
                return `${this._cardItemName}`;
            }
            // for capsule
            if (this.isCapsuleEmpire()) {
                return `${this._cardItemName}`;
            }
            // for pass
            if (this.isPassEmpire()) {
                return `${this._cardItemName}`;
            }
            // for phases 
            if (this.isSpecialPhase()) {
                return `${this._cardItemType} | ${this._cardItemName} (${this._cardQuality}) - ${this._phase}`;
            }
            // for music kit
            if (this.isMusicKitEmpire()) {
                return `${this._cardItemName}`;
            }
            // for all other default gun skins
            else {
                // gotten: ★ Karambit | Gamma Doppler (Factory New)
                // desired: 
                return `${this._cardItemType} | ${this._cardItemName} (${this._cardQuality})`;
            }
        }
    }

    getAllValuesAsString() {
        return `${this._cardQuality} ${this._cardFloat} ${this._cardItemType} ${this._cardItemName} ${this._currencyValue} ${this._currencyValueMarketplace} ${this._priceDifference} ${this._phase} ${this._site}`;
    }

    calculatePriceDifference() {
        if (this._currencyValueMarketplace > 0 && this._currencyValue > 0) {
            this._priceDifference = parseFloat(((this._currencyValueMarketplace - this._currencyValue) / this._currencyValue) * 100).toFixed(2);
            return;
        }
        this._priceDifference = 0;
    }

    getUniqueIdentifier() {
        return `${this._cardItemName} | ${this._cardQuality} | ${this._cardFloat} | ${this._currencyValue}`;
    }

    getUniqueIdentifierFull() {
        return `${this._cardQuality} | ${this._cardFloat} | ${this._cardItemType} | ${this._cardItemName} | ${this._currencyValue} | ${this._currencyValueMarketplace} | ${this._priceDifference} | ${this._phase} | ${this._site} | ${this._count}`;
    }

    isNull() {
        return this.getUniqueIdentifier() === 'null | null | null | null';
    }

    isCompletelyNull() {
        return (
            (this._cardQuality === null || this._cardQuality === undefined) &&
            (this._cardFloat === null || this._cardFloat === undefined) &&
            (this._cardItemType === null || this._cardItemType === undefined) &&
            (this._cardItemName === null || this._cardItemName === undefined) &&
            (this._currencyValue === null || this._currencyValue === undefined) &&
            (this._currencyValueMarketplace === null || this._currencyValueMarketplace === undefined) &&
            (this._phase === null || this._phase === undefined) &&
            (this._priceDifference === null || this._priceDifference === undefined) &&
            (this._count === null || this._count === undefined)
        );
    }

    isValid() {
        return this.getUniqueIdentifier() && this.getFormattedName() && !this.isNull();
    }

    isNotPainted() {
        const knifeTypes = [
            "Bayonet", "Flip Knife", "Gut Knife", "Karambit", "M9 Bayonet", "Huntsman Knife", 
            "Falchion Knife", "Bowie Knife", "Butterfly Knife", "Shadow Daggers", "Navaja Knife", 
            "Stiletto Knife", "Ursus Knife", "Talon Knife", "Paracord Knife", "Survival Knife", 
            "Nomad Knife", "Skeleton Knife", "Classic Knife", "Kukri Knife" 
        ];

        if (this._site === 'csgoempire') {
            return this._cardFloat === null && 
                   this._cardItemType === null &&
                   this._cardQuality === null &&
                   this._cardItemName !== null && 
                   knifeTypes.some(type => this._cardItemName.includes(type));
        } else if (this._site === 'csgoroll') {
            return this._cardItemType !== null && 
                   this._cardItemName === null && 
                   knifeTypes.some(type => this._cardItemType.includes(type));
        } else if (this._site === 'csfloat') {
            return this._cardItemType !== null && 
                   this._cardItemName === null && 
                   knifeTypes.some(type => this._cardItemType.includes(type));
        }
        return false;
    }

    isSpecialPhase() {
        if (this._phase && (this._phase.includes("Emerald") || 
            this._phase.includes("Black Pearl") || 
            this._phase.includes("Ruby") || 
            this._phase.includes("Sapphire") ||
            this._phase.includes("Phase 1") ||
            this._phase.includes("Phase 2") ||
            this._phase.includes("Phase 3") ||
            this._phase.includes("Phase 4"))) {
            return true;
        }
        return false;
    }

    isSticker() {
        return this._cardItemType && this._cardItemType.includes("Sticker");
    }

    isAgentEmpire() {
        return !!(this._cardItemName && agentPrefixRegex.test(this._cardItemName));
    }
    isAgentRoll() {
        return this._cardItemType && agentNames.includes(this._cardItemType);
    }

    isCaseRoll() {
        return this._cardItemType && this._cardItemType.includes("Case");
    }
    isCaseEmpire() {
        return this._cardItemName.includes("Case");
    }

    isGraffitiRoll() {
        return this._cardItemType && this._cardItemType.includes("Graffiti");
    }
    isGraffitiEmpire() {
        return this._cardItemType && this._cardItemType.includes("Graffiti");
    }

    isPinRoll() {
        return this._cardItemType && this._cardItemType.includes("Pin");
    }
    isPinEmpire() {
        const name = this._cardItemName;
        // Pins on csgoempire end with the standalone word "Pin" (capital P)
        return !!(name && /\bPin$/.test(name));
    }

    isCharmRoll() {
        return this._cardItemType && this._cardItemType.includes("Charm");
    }
    isCharmEmpire() {
        const name = this._cardItemName;
        // Charms on csgoempire begin with "Charm |"
        return !!(name && /^Charm\s*\|/.test(name));
    }

    isCapsuleRoll() {
        return this._cardItemType && this._cardItemType.includes("Capsule");
    }
    isCapsuleEmpire() {
        return this._cardItemName.includes("Capsule");
    }

    isPassRoll() {
        return this._cardItemType && this._cardItemType.includes("Pass");
    }
    isPassEmpire() {
        return this._cardItemName.includes("Pass");
    }

    isMusicKitRoll() {
        return this._cardItemType && this._cardItemType.includes("Music Kit");
    }
    isMusicKitEmpire() {
        return this._cardItemName.includes("Music Kit");
    }   
}
