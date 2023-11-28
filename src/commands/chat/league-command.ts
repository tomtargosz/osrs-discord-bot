import { ChatInputCommandInteraction, PermissionsString } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';

import { InteractionUtils } from '../../utils/index.js';
import { TableBuilder } from '../../utils/table-builder.js';
import { Command, CommandDeferType } from '../index.js';

const shuffle = (arr: string[]): string[] =>
    arr
        .map(value => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);

const summoners = ['Tom', 'Dan', 'Collin', 'Cody', 'Ryan'];
const roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Support'];

type SummonerWithRole = {
    role: string;
    summoner: string;
};

export class LeagueCommand implements Command {
    public names = ['league'];
    public cooldown = new RateLimiter(1, 5000);
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction): Promise<void> {
        const shuffledSummoners = shuffle(summoners);

        const rows: SummonerWithRole[] = Array.from(Array(5)).map((_, i) => ({
            role: roles[i],
            summoner: shuffledSummoners[i],
        }));

        const table = new TableBuilder<SummonerWithRole>([
            {
                width: 10,
                label: 'Role',
                index: 1,
                field: 'role',
            },
            {
                width: 10,
                label: 'Summoner',
                index: 2,
                field: 'summoner',
            },
        ]);

        rows.forEach(row => table.addRows(row));

        await InteractionUtils.send(intr, table.build());
    }
}
