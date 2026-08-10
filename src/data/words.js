// Five-letter word lists for the Wordle game.
//
// ANSWERS is the pool the daily puzzle is drawn from — common words only, no
// plurals, nothing obscure. Appending to it is safe; inserting or reordering
// is not, since the daily word is derived from a word's index (see
// answerForDay in src/lib/wordle.js) and would shift every future puzzle.
//
// EXTRA holds words that are accepted as guesses but never chosen as answers:
// plurals, verb forms, and less common words. Guess validation checks both.

const ANSWERS_RAW = `
about above abuse actor acute admit adopt adult after again agent agree ahead
alarm album alert alike alive allow alone along alter among anger angle angry
ankle apart apple apply arena argue arise armor array arrow aside asset avoid
awake award aware badly baker basic basil beach began begin being below bench
berry birth black blade blame blank blast blaze bleak blend bless blind block
blood bloom board boost booth bound brain brand brave bread break breed brick
bride brief bring broad broke brown brush build built bunch burnt burst cabin
cable camel canal candy cargo carve catch cause cease chain chair chalk charm
chart chase cheap check cheek cheer chess chest chief child chill choir chose
civic civil claim clash class clean clear clerk click cliff climb clock close
cloth cloud coach coast color comic coral couch could count court cover crack
craft crash crazy cream creek crest crime crisp cross crowd crown crude cruel
crush curve cycle daily dairy dance dated dealt death debut decay decor delay
delta dense depth derby devil diary dirty disco ditch dizzy dodge doing donor
doubt dozen draft drain drama drank drawn dream dress dried drift drink drive
drove drown drunk dying eager eagle early earth eight elbow elder elect elite
empty ended enemy enjoy enter entry equal error essay event every exact exist
extra faith false fancy fatal fault favor feast fence ferry fever fiber field
fiery fifth fifty fight final first flame flash fleet flesh float flock flood
floor flour fluid flush focal focus force forge forth forty forum found frame
fraud fresh front frost fruit fully funny gauge ghost giant given giver glass
gleam globe glory glove going grace grade grain grand grant grape graph grasp
grass grave great green greet grief grill grind groan gross group grove growl
grown guard guess guest guide guilt habit happy harsh haunt heart heavy hedge
hello hence hobby holly honey honor horse hotel house human humor hurry ideal
image imply index inner input irony issue ivory jewel joint judge juice jumbo
karma kneel knife knock known label labor large laser later laugh layer learn
lease least leave legal lemon level lever light limit linen liver lobby local
lodge logic loose lorry loser loved lower loyal lucky lunar lunch lying magic
major maker mango maple march match maybe mayor meant medal media melon mercy
merit merry metal meter midst might minor minus mixed model modem moist money
month moral motor mount mouse mouth movie music naked nasty naval nerve never
newly night noble noise north novel nurse occur ocean offer often olive onion
opera orbit order organ other ought ounce outer owner oxide ozone paint panel
panic paper parka party pasta patch pause peace peach pearl pedal penny phase
phone photo piano picky piece pilot pinch pitch pixel pizza place plain plane
plant plate plaza plead point polar porch pound power press price pride prime
print prior prize probe promo proof proud prove pulse punch pupil purse queen
query quest queue quick quiet quilt quite quota quote radar radio raise rally
ranch range rapid ratio raven reach react ready realm rebel refer reign relax
relay renew reply rider ridge rifle right rigid rinse risky rival river roast
robot rocky rogue roman rough round route royal rugby ruler rumor rural sadly
safer saint salad salon sauce scale scare scene scent scope score scout scrap
screw sense serve seven shade shaft shake shall shame shape share shark sharp
sheep sheer sheet shelf shell shift shine shiny shirt shock shoot shore short
shown sight silly since siren sixth sixty skill skirt slate sleep slice slide
slope small smart smell smile smoke snake sneak snowy solar solid solve sorry
sound south space spare spark speak spear speed spell spend spent spice spike
spine spite split spoke spoon sport spray squad stack staff stage stain stair
stake stamp stand stare start state steal steam steel steep steer stern stick
still sting stock stone stood stool store storm story stove strap straw strip
stuck study stuff style sugar suite sunny super surge sweet swept swift swing
sword syrup table taken tally tango taste teach teeth tempo tenth thank theft
their theme there these thick thief thing think third thorn those three threw
throw thumb tiger tight timer tired title toast today token tonic tooth topic
torch total touch tough tower toxic trace track trade trail train trait trash
treat trend trial tribe trick tried troop trout truck truly trunk trust truth
tulip tumor tutor twice twist ultra uncle under union unite unity until upper
upset urban urged usage usual vague valid value valve vapor vault venue verse
video villa vinyl viral virus visit vital vivid vocal voice voter wagon waist
waste watch water weary wedge weird whale wheat wheel where which while white
whole whose widow width witch woman women world worry worse worst worth would
wound wrist write wrong wrote yacht yield young youth zebra
`

// Accepted as guesses but never used as the answer.
const EXTRA_RAW = `
acres actas added adept adore aged agile aided aimed aisle alley allot aloud
amber amend ample amuse angel apron areas argon arose ashes atlas attic audio
aunts autos awful axiom bacon badge bagel baked balls bands banjo banks barge
basin basis batch bathe baths beads beams beans bears beast beats beers beets
began beige bells belly belts bends bible bikes bills binds birds bites blast
blogs blues blunt blurt boats bodes bolts bonds bones bonus books boots bored
bores bosses bowls boxer boxes brace brake brass brawl brews brims broth bulbs
bulky bumps burns buses busts buyer bytes cabin cadet cages cakes calls calms
camps canes cards cared cares carts cases casts cater caves cells cents chaos
chaps chats chefs chess chips chops chord chore chose chunk churn cider cigar
cited cites clams clamp claps claws clays clips clods clogs clone clots clubs
clues coals coats codes coins colon colts comet comma cones cooks cools cords
cores corks corns costs cotta coupe cover cowed crabs crane crank crate crawl
crazy creed creep crept crews cried cries crisp crops crows crumb cubes cubic
cuffs cults cupid cured cures curls curly curry curse curved cyber cysts dandy
dares dated dates dazed deals deans dears debit debts decks decoy deeds deems
deeps deity delve demos dents depot desks dials diced dimes dines dips diner
disks dives docks dolls dolly domes donut doors doses dotes doves downs dozed
drags drape drawl drays dread dregs dries drips drops drugs drums ducks dukes
dunes dusks dusty dwarf dwell dyers eaves ebony edges edits eject elope elves
emits enact ended endow epics equip erase erect erode erupt evade evens evict
evoke exalt excel exert exile exits expel extol fable faced faces facts fades
fails fairs fakes falls famed fangs farms fasts fates fauna fawns fears feeds
feels fetch feuds fewer fiats fifes fills films finds fined fines fired fires
firms fists fixed fixes flags flaws flaps flats flaxen flees flies flint flips
flirt flits flops flows flute foams foils folds folks fonts foods fools foots
forms forts fouls fowls frays freed frees frogs fronds fumes funds furry fused
gains gaits gales gangs gaps gases gates gauze gawks gazes gears gecko geese
gelds germs gifts gills gilts girls gists glare glaze glide gloom glows glued
gnome goals goats golds golfs gongs goods gores gorge gowns grabs grads grams
grays grids grins grips grits grope grout grubs gruff guest gulfs gulls gulps
gusto gusts gyros hacks hails hairs hales halls halts hands hangs hares harms
harps hasty hatch hated hates hauls hawks hazel heads heals heaps hears heats
heirs helms helps herbs herds heron hides hikes hills hilly hinds hinge hints
hires hives hoard hoist holds holes homes honks hoods hooks hoops hoots hopes
horns hosts hound hours howls hulls humps hunts hurls hurts husks hyena hymns
icons ideas idled idles idols igloo inept inert infer ingot inked inlet irate
irked irons islet items jacks jails jambs jaunt jeans jelly jerky jetty jokes
jolts joust judos juicy jumps junks juror kayak keeps kelps kicks kilns kilts
kinds kings kiosk kites kitty knack knead knees knelt knits knobs knots koala
kudos lacks lacys lakes lambs lamps lands lanes lapse larks lasts latch lawns
layup leads leaks leaps leash leaks ledge leeks lefts legit lends lents lets
libel licks liens lifts likes limbs limes lined lines links lints lions lisps
lists lived lives loads loafs loans lobes locks locus lofts logos loins looks
looms loops loots lords lores losses lotus louse loves lucid lulls lumps lunge
lured lures lurks lusty lynch lyric maces macro madam madly mails maims mains
malls manes manor maple marks marsh masks masts mates maths mauve maxim mazes
mails meals means meats meets melds melts memos mends menus meows mesas messy
metro miced micro midge miens miles milks mills mimes minds mines mints mires
mists mites mixer moans moats mocks modes molar molds moles molts monks moods
moons moors moose mopes moral morph moses moths motto mound mourn moves mowed
mucus muddy mugs mules mumps munch mused muses musky musty mutes myths nails
names napes naps nasal navel necks needs neons nests nets newer newts nicer
niche nicks nines ninja ninth noise nomad nooks noons norms noses notch noted
notes nouns nudge nukes numbs nurse nutty nylon oaths obeys obese oboes odder
odors offal often oiled oinks okays older olive omega omens omits onset opals
opens opted orals orbs organ ounce ovals ovens overs owing owlet owned oxen
paced paces packs pacts paddy pagan pages pails pains pairs pales palms panda
panes pangs pants papal pards parks parse parts pasts paths patio pawns payer
peaks peals pears peats pecks peers pelts pends penny perch peril perks pesky
pests petal petty pewter phony picks piers piety piles pills pines pings pints
pipes pique pitas pithy plaid plans plant plate plays pleas plied plots plows
ploys plugs plumb plume plump plums plush poems poets poked poker poles polls
polyp ponds pools poppy pores ports posed poses posts pouch pours pouts praise
prank prays preps preys prick pries primo prims prints prism prods profs prone
props props prose prowl prude prune psalm pubic pucks puffs pulls pulps pumps
punks punts pupas puppy purge purrs pushy putts pylon pyres quack quads quail
quake qualm quart quays quell quirk quits rabid raced races racks radii rafts
raged rages raids rails rains rakes ramps ranks rants rapid rared rasps rated
rates raves rayon razes reads reams reaps rears rebus recap recur redly reeds
reefs reels refit regal reins relic remit rends rents repay repel resin rests
revel revue rhino rhyme ribs ricks rides rifts rimes rinds rings riots ripen
risen rises risks rites roads roams roars robes robin rocks rodeo roles rolls
roofs rooks rooms roost roots ropes roses rotor rouse routs rowdy rowed rubes
rubs ruddy ruins rules rumps rungs runes runts ruses rusts rusty sacks sages
sails saint salts salve sands sands sandy saner sappy sated sauna saved saves
savor sawed scabs scald scalp scamp scans scant scars scoff scold scoop scoot
scorn scrub seals seams seats sects sedan seeds seeks seems seeps seers sells
sends serfs setup sewer shack shale shams shard shave shawl shear sheds sheik
shins ships shirk shoal shoes shone shops shots shove shrub shrug shuns shunt
sicks sided sides siege sieve sighs sight signs silks silky sills silos silty
sings sinks sires sites sixes sizes skate skews skids skies skims skins skips
skulk skull skunk slabs slack slain slams slang slaps slash slats slaves slays
sleds sleek sleet slept slims slink slips slits slobs slogs slots slows sluff
slugs slump slums slung slurp slush slyly smack smash smear smelt smirk smite
smith smock smoky smote snack snags snail snaps snare snarl sneer snide sniff
snipe snobs snoop snore snort snout snows snuck snuff soaks soaps soars sober
socks sodas sofas soggy soils solos songs sonic sooty sorts souls soups sours
sowed spade spans spars spasm spats spawn spays speck specs sped spied spies
spill spilt spins spiny spits spoil spool spore spots spout spuds spume spurn
spurs spurt squat squid stabs stags stale stalk stall stamp stank stars stash
stave stays stead steed stems steps stews stiff stilt stink stint stirs stoic
stoke stomp stony stops stork stout stows strut stubs studs stump stung stunt
styes suave sucks suds suede suits sulks sully sumps sunup surer surfs swabs
swamp swans swaps swarm swath swats sways swear sweat sweep swell swigs swill
swims swine swipe swirl swish swoop swore sworn swung syncs tacit tacks tacos
tacts tails taint takes tales talks tamed tames tamps tanks tapes tapir tardy
tarps tarts tasks taunt taxed taxes teams tears teams teals teary teems teens
tells tempt tends tenor tense tents terms terse tests thaws theirs thins thong
thorn thuds thugs tics tided tides tiers tiled tiles tilts times tinge tints
tipsy tires toads toads toils tokes tolls tombs tomes toned tones tongs tools
toots topaz topic torso torts tosses touts towed towel towns toxin toyed toys
tracts trams traps trays tread trees treks tress tribe trims trios trips trite
trods trolls troth trove truce trued trues trump tsars tubas tubes tucks tufts
tugs tulle tunas tuned tunes tunic turfs turns tusks tweak tweed tweet twigs
twine twins twirl twits typed types tyres udder ulcer umber umped uncut undid
undue unfed unfit unify unlit unmet unpin unsay untie unwed unzip upend urges
urine users ushers usurp utter vales valet valor vamps vanes vans vases vats
veals veers veils veins vends venom vents venus verbs verge verve vests vetch
vexed vials vibes vices views vigil vigor vines viola viper visas visor voids
voile voled volts vomit voted votes vouch vowed vowel vying wacky waded wades
wafer wafts waged wager wages wagon waifs wails waits waive waked wakes walks
walls wands wanes wants wards wares warms warns warps warts washy wasps watts
waved waver waves waxed waxen waxes weals weans wears weave webby wedge weeds
weeks weeps weighs welds wells welts wenches wends wetly whack whams wharf
wheat whelp whens whets whiff whigs whims whine whips whirl whirs whisk whist
whits whizz whoop whorl wicks widen wider wields wilds wiled wiles wills wilts
wimps winch winds windy wined wines wings winks wiped wipes wired wires wised
wisps witty wives woken wolds wolfs womb wonts woods woody wooed wools woozy
words works worms worns wraps wrath wreak wreck wrens wring wrist writs yanks
yards yarns yawls yawns yeahs yearn years yeast yells yelps yetis yodel yogas
yogis yokes yolks yowls yucca yummy zeals zebus zeros zests zings zippy zonal
zoned zones zooms
`

function parse(raw) {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => /^[a-z]{5}$/.test(w))
}

export const ANSWERS = Array.from(new Set(parse(ANSWERS_RAW)))

const answerSet = new Set(ANSWERS)

// Every answer is also a legal guess.
export const VALID_GUESSES = new Set([
  ...ANSWERS,
  ...parse(EXTRA_RAW).filter((w) => !answerSet.has(w)),
])
