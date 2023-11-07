import { ChatInputCommandInteraction, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import fetch from 'node-fetch';

import { InteractionUtils } from '../../utils/index.js';
import { TableBuilder } from '../../utils/table-builder.js';
import { Command, CommandDeferType } from '../index.js';

const starMaxMineTime: Record<string, number> = {
    9: 63,
    8: 56,
    7: 49,
    6: 42,
    5: 35,
    4: 28,
    3: 21,
    2: 14,
    1: 7,
};

type Star = {
    region: string;
    time: number;
    world: number;
    tier: number;
    loc: string;
    scout: string;
};

type StarWithRemainingTime = Star & {
    timeRemaining: number;
};

const getEstimatedTimeRemaining: (star: Star) => number = (star: Star) => {
    return star.tier * 7;
};

const getGreeting: () => string = () => {
    // For AWS
    const timelagging = 6;
    const utc = new Date();
    const hours = new Date(utc.getTime() - 1 * 60 * 60 * 1000 * timelagging).getHours();

    // const hours = new Date().getHours();
    if (hours >= 6 && hours < 12) {
        return 'Good morning! I hope you have a great day ahead of you. Let me show you where the current stars are:';
    } else if (hours >= 12 && hours < 18) {
        return 'Good afternoon! Make sure to eat a nutritious lunch to sustain you for the rest of your day- might I suggest some black bean soup?';
    } else if (hours >= 18 && hours <= 23) {
        return `Good evening! Shouldn't you be focusing on your league game with the boys instead of mining stars?`;
    } else {
        return 'Staying up late are we? Blue light can disrupt your sleep- make sure to put on those gunners!';
    }
};

export class StarCommand implements Command {
    public names = ['star'];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const tokenOne = btoa(
            JSON.stringify({
                alg: 'none',
                typ: 'JWT',
            })
        );
        const tokenTwo = btoa(
            JSON.stringify({
                data: 'osrs_stars',
                exp: Math.floor(Date.now() / 1e3) + 300,
            })
        );
        const starData = await fetch('https://osrsportal.com/activestars-foxtrot', {
            headers: {
                Referer: 'https://osrsportal.com/shooting-stars-tracker',
                authorization: `Bearer ${tokenOne}.${tokenTwo}.`,
            },
            method: 'GET',
        });

        if (starData.ok) {
            starData.json().then(async (data: Array<Star>) => {
                const formattedStars: Array<StarWithRemainingTime> = data.map(x => {
                    return { ...x, timeRemaining: getEstimatedTimeRemaining(x) };
                });
                const stars = formattedStars.filter(
                    x => starMaxMineTime[x.tier.toString()] - 30 > x.time
                );

                const table = new TableBuilder<StarWithRemainingTime>([
                    {
                        width: 40,
                        label: 'Location',
                        index: 1,
                        field: 'loc',
                    },
                    {
                        width: 10,
                        label: 'World',
                        index: 2,
                        field: 'world',
                    },
                    {
                        width: 25,
                        label: 'Est. Time Remaining',
                        index: 3,
                        field: 'timeRemaining',
                    },
                ]);

                if (stars.length === 0) {
                    await InteractionUtils.send(intr, 'No stars currently available. :(');
                } else {
                    stars
                        .sort((a, b) => getEstimatedTimeRemaining(b) - getEstimatedTimeRemaining(a))
                        .slice(0, 8)
                        .forEach(star => table.addRows(star));

                    const message =
                        intr.user.username === 'uaremyfriend'
                            ? `Wow, my best buddy Dan! ${getGreeting()}\n${table.build()}`
                            : table.build();

                    await InteractionUtils.send(intr, message);
                }
            });
        } else {
            starData
                .json()
                .then(async message => {
                    await InteractionUtils.send(intr, `Error: ${JSON.stringify(message)}`);
                })
                .catch(async message => {
                    await InteractionUtils.send(intr, `Error: ${message}`);
                });
        }
    }
}
