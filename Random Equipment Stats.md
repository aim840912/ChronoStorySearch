# Random Equipment Stats
## An Equipment's random stats are determined by its Level Requirement.

## Min/Max Range = Req Lv/10
- The value added/subtracted from the equipment can be any decimal number between the Min and Max of the Range. It is rounded to the nearest integer at the end.
- Range will be added/subtracted from the default stats of the equipment
- Overall's Min/Max Range is multiplied by 2 to match the possible range of Tops & Bottoms

### STR, DEX, INT, LUK = Range split evenly among the Stats
### WATK, MATK = Range * 1/2
### ACC, AVOID = Range
### Speed = Range * 1/2
### Jump = Range * 1/4
### HP, MP, WDEF, MDEF = Range * 5



## Example: Silver Identity
Default Stats:
- Lv 60
- Dex: 1
- Luk: 3
- Wdef: 39
### Level 60... Min/Max Range = 60 / 10 = 6

(RNG) = Random integer that can be 1 to 1,000,000 divided by 1,000,000
ROLL(x,y) = Random integer between and including x, y
RANGE = '6'
-# ex. Roll(1,5) = 1, 2, 3, 4, or 5
### DEX = 1 + '6'/2 * ROLL(-1, 0, 1) * (RNG)
- Range is divided by 2 because there are two main stats (6 / 2 = 3)
### LUK = 3 + '6'/2 * ROLL(-1, 0, 1) * (RNG)
### WDEF = 39 + '6' * 5 * ROLL(-1, 0, 1) * (RNG)