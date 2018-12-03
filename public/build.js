

// Core stuff

function Block(props) {
    const style = props.style || {};
    if( props.inline ) {
        style.display = 'inline-block';
    }
    style.verticalAlign = 'top';
    return (<div style={style}>
        {props.children}
    </div>);
}


function Title(props) {
    return (<Block inline style={{
        fontSize: '150%',
    }}>
        {props.children}
    </Block>);
}


// Translation data

function t(str) {
    const strings = {
        'skill:gun combat.slug pistol': 'Slug Pistol',
        'skill:gun combat.slug rifle': 'Slug Rifle',
        'skill:gun combat.shotguns': 'Shotguns',
    };
    return !strings[str] ? (str || console.warn(`Unknown string ${str}`)) : strings[str];
}


// Traveller specific


class SkillNumber extends React.Component {
    constructor(props) {
        super(props);
        this.skill = props.skill;
    }

    render() {
        const style = {
            padding: '0.3em',
            width: '3em',
        };
        return <Block inline style={style}>
            <Block inline>{this.skill.name} {this.skill.value}</Block>
        </Block>;
    }
}




class SkillList extends React.Component {
    constructor(props) {
        super(props);

        this.skills = [{
            name: 'skill:gun combat.slug pistol',
            value: 2
        }, {
            name: 'skill:gun combat.slug rifle',
            value: 2
        }, {
            name: 'skill:gun combat.shotguns',
            value: 2
        }];
    }

    render() {
        return <Block>
            {this.skills.map( skill => {
                return <Block key={skill.name}>
                    {t(skill.name)}: {skill.value}
                </Block>;
            })}
        </Block>;
    }
}




class SkillBox extends React.Component {
    constructor(props) {
        super(props);

        const s = (name) => props.character.stats.find(s => s.name === name).value;

        this.stats = {
            physical: [{
                name: 'Str',
                value: s('str'),
            }, {
                name: 'Dex',
                value: s('dex'),
            }, {
                name: 'End',
                value: s('end'),
            }],
            mental: [{
                name: 'Int',
                value: s('int'),
            }, {
                name: 'Edu',
                value: s('end'),
            }, {
                name: 'Soc',
                value: s('soc'),
            }],
        };
    }

    render() {
        const skillSquare = stat => {
            return <SkillNumber
                key={stat.name}
                skill={stat}
                />;
        };

        return <Block style={{
            padding: '0.5em',
        }}>
            {Object.keys(this.stats).map(type => {
                return <Block
                        key={type}>
                    {this.stats[type].map(skillSquare)}
                </Block>
            })}
        </Block>
    }
}

class CharacterFace extends React.Component {
    render() {
        return <div style={{
            margin: 0,
            padding: 0,
            background: 'rgb(250,235,215)',
            width: '2em',
            height: '2em',
            borderRadius: '1em',
        }}></div>;
    }
}


class CharacterList extends React.Component {
    render() {
        return <Block style={{
            padding: '1em',
        }}>
            <CharacterFace/>
        </Block>;
    }
}


class InfoPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            character: props.character,
        };
    }

    render() {
        return (<Block>
            <Block inline>
                <CharacterList/>
            </Block>
            <Block inline>
                <Title>{this.state.character.name}</Title>
                <SkillBox character={this.state.character}/>
                <SkillList/>
            </Block>
        </Block>);
    }
}


class Application extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<InfoPage character={CHARACTER_DATA}/>);
    }
}

const domContainer = document.querySelector('#root');
ReactDOM.render(React.createElement(Application), domContainer);
