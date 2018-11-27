
// Render the skills as they are
const fs = require('fs');


function getTransformers() {
    return {
        'getmod': (num) => Math.floor(num/3) - 2,
        'skill': (ranks) => {
            return ranks === 0 ? -3 : ranks - 1;
        },
        'spec-skill': (parentRanks, ranks) => {
            return parentRanks === 0 ? -3 : parentRanks + ranks -1;
        },
        'combat': (stat, skill) => {
            // TODO: handle if the stat isn't trained
            return stat + skill;
        }
    };
}


function getSystem() {

    const SKILLS = require('./data/skills');

    const systemStats = {
        combat: {
            'ranged weapon': {
                'slug pistol': [ 'dex', 'skill:gun combat.slug pistol'],
                'slug rifle': [ 'dex', 'skill:gun combat.slug rifle'],
                'shotguns': [ 'dex', 'skill:gun combat.shotguns'],
                'energy pistol': [ 'dex', 'skill:gun combat.energy pistol'],
                'energy rifle': [ 'dex', 'skill:gun combat.energy rifle'],
                'launcher': [ 'dex', 'skill:heavy weapons.launcher' ],
            },
        },
    };

    const system = [{
        name: 'strength',
    }, {
        name: 'dexterity',
    }, {
        name: 'endurence',
    }, {
        name: 'intellect',
    }, {
        name: 'education',
    }, {
        name: 'social',
    }, {
        name: 'str',
        transformer: {
            'getmod': [ 'strength' ],
        },
    }, {
        name: 'dex',
        transformer: {
            'getmod': [ 'dexterity' ],
        },
    }, {
        name: 'end',
        transformer: {
            'getmod': [ 'endurence' ],
        },
    }, {
        name: 'int',
        transformer: {
            'getmod': [ 'intellect' ],
        },
    }, {
        name: 'edu',
        transformer: {
            'getmod': [ 'education' ],
        },
    }, {
        name: 'soc',
        transformer: {
            'getmod': [ 'social' ],
        },
    }].concat(SKILLS.map( skill => {
        if( typeof skill === 'string' ) {
            return {
                name: 'skill.ranks:' + skill,
            };
        }
        return {
            name: 'skill.ranks:' + skill.name,
        };
    })).concat(SKILLS.map( skill => {
        let skillName = skill;
        if( typeof skill !== 'string' ) {
            skillName = skill.name;
        }
        return {
            name: 'skill:' + skillName,
            transformer: {
                'skill': ['skill.ranks:' + skillName],
            },
        };
    })).concat( SKILLS.filter(s => s.specialities).reduce((acc, skill) => {
        // all skills reduce to a []
        skill.specialities.forEach( spec => {
            const skillName = skill.name + '.' + spec;
            acc.push({
                name: 'skill:' + skillName,
                transformer: {
                    'spec-skill': [
                        // parent
                        'skill.ranks:' + skill.name,
                        // this one
                        'skill.ranks:' + skillName,
                    ],
                },
            });
        });
        return acc;
    }, [])).concat( SKILLS.filter(s => s.specialities).reduce((acc, skill) => {
        // all skills reduce to a []
        skill.specialities.forEach( spec => {
            acc.push({
                name: 'skill.ranks:' + skill.name + '.' + spec,
            });
        });
        return acc;
    }, [])).concat(Object.keys(systemStats).reduce((acc, category) => {
        // This converts systemStats and expands each from tree-style to list-style
        //
        //    combat: {
        //        'ranged weapon': {
        //            'slug rifle': [
        //                'dex',
        //                'skill:gun combat.slug rifle'
        //            ],
        //        },
        //    },
        //
        //
        // "name": "combat:ranged weapon.slug rifle",
        // "transformer": {
        //    "combat": ["dex", "skill:gun combat.slug rifle"]
        //
        //
        // category = "combat"
        return acc.concat(Object.keys(systemStats[category]).reduce((acc, action) => {
            // action = "ranged weapon"
            return acc.concat(Object.keys(systemStats[category][action]).reduce((acc, type) => {
                // type = "slug rifle"
                const transformer = {};
                transformer[category] = systemStats[category][action][type];
                return acc.concat([{
                    name: `${category}:${action}.${type}`,
                    transformer,
                }]);
            }, []));
        }, []));
    }, []));

    const systemJsonPath = './data/system.json';
    fs.writeFile(systemJsonPath, JSON.stringify(system, null, 2), () => {
        console.log('Wrote generated system to file: ' + systemJsonPath);
    });

    return system;
}

function getCharacterData() {
    return require('./player/ajax');
}

function getBaseStats( actions, system ) {
    return system.filter(n => !n.transformer ).map( number => {
        const action = actions.find(a => {
            return a.data.name === number.name && (
                a.type === 'add_number' || a.type === 'set_number'
            );
        });

        if( !action ) {
            // console.log('No set number value for ' + number.name );
            return {
                name: number.name,
                value: 0,
            };
        }

        // TODO: sum the results if it's add number not set number
        return {
            name: number.name,
            value: action.data.value,
        };
    });
}

// Get the transformer from the data
function getTransformer(data) {
    const transformFuncs = Object.keys(data.transformer);
    const args = data.transformer[transformFuncs[0]];
    return {
        name: transformFuncs,
        args: args,
    };
}

function getNextStats( actions, system, transformers, stats ) {
    const listOfAcceptableArgs = stats.map( s => s.name );

    return system.filter( number => {
        // Every arg must be in the listOfAcceptableArgs
        return getTransformer(number).args.reduce( (acc, arg) => {
            return acc && listOfAcceptableArgs.includes(arg);
        }, true);
    }).map( number => {
        const transformer = getTransformer(number);
        const func = transformers[ transformer.name ];

        const argValues = transformer.args.map( arg => {
            return stats.find(s => s.name === arg).value;
        });

        const value = func.apply(null, argValues);
        return {
            name: number.name,
            value: value,
        };
    });
}



function getCharacterStats( actions, system, transformers ) {
    // First, get all the stats that do not have parent transformations
    // These are always set by set_number actions
    let stats = getBaseStats(actions, system);
    let maxIterations = 1000;
    let statNames = stats.map(n => n.name);
    let remainingSystem = system.filter(n => !statNames.includes(n.name));

    do {
        // Then get all the stats whose transformations only include the previous generation
        stats = stats.concat(getNextStats(actions, remainingSystem, transformers, stats ));

        // And so on until they are all processed
        statNames = stats.map(n => n.name);
        // Shrink the remaining system so we're not re-adding all of them
        remainingSystem = system.filter(n => !statNames.includes(n.name));
    } while(remainingSystem.length > 0 && --maxIterations > 0);

    return stats.sort((a, b) => b.value - a.value);
}


class Character {
    constructor(data, system, transformers) {
        this.data = data;
        this.system = system;
        this.transformers = transformers;
        this.stats = getCharacterStats(this.data.actions, this.system, this.transformers);
    }

    getSummary() {
        const topSkillCount = 8;
        const topFiveSkills = this.stats.filter(s => {
            return s.name.includes("skill:");
        }).sort((a, b) => {
            return b.value - a.value;
        }).slice(0, topSkillCount);
        return {
            name: this.data.name,
            aspects: {
                str: this.getValue('str'),
                dex: this.getValue('dex'),
                end: this.getValue('end'),
                int: this.getValue('int'),
                edu: this.getValue('edu'),
                soc: this.getValue('soc'),
            },
            topSkills: topFiveSkills,
            combat: {
                'slug pistol': this.getValue('combat:ranged weapon.slug pistol'),
                'slug rifle': this.getValue('combat:ranged weapon.slug rifle'),
                'launcher': this.getValue('combat:ranged weapon.launcher'),
            },
        };
    }

    getValue(name) {
        return this.stats.find(s => s.name === name).value;
    }

    addPoints(name, value) {
        this.data.actions.push({
            type: "add_number",
            data: {
              name,
              value,
            },
        });
        // TODO set the state, or related
        this.stats = getCharacterStats(this.data.actions, this.system, this.transformers);
    }
}


function entry() {
    const data = getCharacterData();
    const system = getSystem();
    const transformers = getTransformers();

    const character = new Character(data, system, transformers);

    console.log( character.getSummary());

    character.addPoints('skill.ranks:heavy weapons', 1);
    character.addPoints('skill.ranks:gun combat.slug rifle', 1);
    console.log( character.getSummary());
}


// Launch here
entry();
