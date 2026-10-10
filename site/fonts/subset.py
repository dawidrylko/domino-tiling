import sys
from pathlib import Path

from fontTools import subset

FAMILY = 'Domino Tiling Math'
POSTSCRIPT_NAME = 'DominoTilingMath-Regular'
FORMULA = ' ()+=124acjknosπ⁡∏\U0001d44e\U0001d457\U0001d458\U0001d45b\U0001d70b'
OUTPUT = Path(__file__).with_name('domino-tiling-math.woff2')


def rename(font):
    name = font['name']
    version = name.getDebugName(5)
    names = {
        1: FAMILY,
        2: 'Regular',
        3: f'{version};{POSTSCRIPT_NAME}',
        4: f'{FAMILY} Regular',
        6: POSTSCRIPT_NAME,
    }

    for name_id in (*names, 16, 17, 21, 22):
        name.removeNames(nameID=name_id)

    for name_id, value in names.items():
        name.setName(value, name_id, 3, 1, 0x409)

    cff = font['CFF '].cff
    cff.fontNames = [POSTSCRIPT_NAME]
    cff.topDictIndex[0].FullName = FAMILY
    cff.topDictIndex[0].FamilyName = FAMILY


def main(source):
    options = subset.Options()
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.flavor = 'woff2'

    font = subset.load_font(source, options)
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=FORMULA)
    subsetter.subset(font)
    rename(font)
    subset.save_font(font, OUTPUT, options)
    print(f'{OUTPUT}: {OUTPUT.stat().st_size} bytes')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 site/fonts/subset.py STIXTwoMath-Regular.otf')

    main(sys.argv[1])
