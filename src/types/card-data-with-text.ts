import { CardData } from 'ygopro-msg-encode';

const STRING_SLOTS = 16;

export class CardDataWithText extends CardData {
  name = '';
  desc = '';
  strings: string[] = Array(STRING_SLOTS).fill('');

  fromPartial(data: Partial<this>): this {
    super.fromPartial(data);

    const name = data.name ?? '';
    const desc = data.desc ?? '';
    const input = data.strings ?? [];
    const strings = Array(STRING_SLOTS).fill('');
    for (let i = 0; i < STRING_SLOTS && i < input.length; i++) {
      const value = input[i];
      strings[i] = value != null ? String(value) : '';
    }

    this.name = name;
    this.desc = desc;
    this.strings = strings;
    return this;
  }
}
