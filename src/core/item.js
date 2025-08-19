import { getLogLevel } from '../core/logLevel.js';
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
            if (this.isAgent()) {
                return `${this._cardItemType} | ${this._cardItemName}`;
            }
            // for case
            if (this.isCase()) {
                return this._cardItemType; 
            }
            // for all other default gun skins
            else {
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

    isValid() {
        return this.getUniqueIdentifier() && this.getFormattedName() && !this.isNull();
    }

    isFiltered() {
        if (this.isNotPainted()) {
            return false;
        }
        if (this._cardItemType.includes("Souvenir")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a souvenir item, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("StatTrak") && (
            this._cardItemType.includes("Bayonet") || 
            this._cardItemType.includes("Flip Knife") || 
            this._cardItemType.includes("Gut Knife") || 
            this._cardItemType.includes("Karambit") || 
            this._cardItemType.includes("M9 Bayonet") || 
            this._cardItemType.includes("Huntsman Knife") || 
            this._cardItemType.includes("Falchion Knife") || 
            this._cardItemType.includes("Bowie Knife") || 
            this._cardItemType.includes("Butterfly Knife") || 
            this._cardItemType.includes("Shadow Daggers") || 
            this._cardItemType.includes("Navaja Knife") || 
            this._cardItemType.includes("Stiletto Knife") || 
            this._cardItemType.includes("Ursus Knife") || 
            this._cardItemType.includes("Talon Knife") || 
            this._cardItemType.includes("Paracord Knife") || 
            this._cardItemType.includes("Survival Knife") || 
            this._cardItemType.includes("Nomad Knife") || 
            this._cardItemType.includes("Skeleton Knife") || 
            this._cardItemType.includes("Kukri Knife") || 
            this._cardItemType.includes("Classic Knife")
        )) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a StatTrak™ knife, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Sticker")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Sticker, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Patch")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Patch, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Graffiti")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Graffiti, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Music Kit")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Music Kit, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Case")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Case, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Key")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Key, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Gift")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Gift, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Operation")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is an Operation, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Pass")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Pass, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Pin")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Pin, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Name Tag")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Name Tag, skipping.`);
            return true;
        } 
        if (this._cardItemType.includes("Capsule")) {
            console[getLogLevel(false)](`Item ${this.getFormattedName()} is a Capsule, skipping.`);
            return true;
        } 

        return false;
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

    isAgent() {
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
        
        return this._cardItemType && agentNames.includes(this._cardItemType);
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

    isCase() {
        return this._cardItemType && this._cardItemType.includes("Case");
    }
}
