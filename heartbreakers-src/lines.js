// ===== Cast reactions =====
// Events: qsGive (she dumps the Q♠ on someone), qsGet (she gets stuck with it), breaks (she breaks hearts),
// fewHearts (she takes a trick with 1–2 hearts), hearts (she takes a trick with 3+ hearts), taunt (sometimes, after a clean trick), moon (she shoots the moon),
// moonVictim (someone else shot it), win (she wins the game).
// Placeholder lines written in each woman’s spirit; swap in her real lines any time.
const LINES = {
  'Ripsi': {
    qsGive: ['A gift from the OG.', 'Season 1 taught me to share.'],
    qsGet: ['Who did this? I’ll ask once.', 'Thirteen points. Noted.'],
    breaks: ['Hearts are open. Somebody had to.', 'I break things. Hearts included.'],
    hearts: ['Fine. Stack ’em up.', 'I’ll hold these. For now.'],
    taunt: ['Clean. Like the original.', 'Y’all are playing. I’m working.'],
    moon: ['Every last point. Original recipe.', 'That’s how the first house did it.'],
    moonVictim: ['All twenty-six? Excuse me?', 'I did not see that coming.'],
    win: ['The OG still runs this house.']
  },
  'Amber M': {
    qsGive: ['Take that and SIT DOWN.', 'Choke on it, sweetie.'],
    qsGet: ['Oh, you want PROBLEMS?', 'Somebody’s gonna answer for this.'],
    breaks: ['HEARTS ARE OPEN. Let’s go!', 'I’m not waiting on nobody.'],
    hearts: ['Ugh! Fine!', 'I’m keeping score. Of YOU.'],
    taunt: ['Who’s next? Anybody?', 'That’s right. Watch me.'],
    moon: ['ALL OF IT! Every single point!', 'Y’all thought! Twenty-six!'],
    moonVictim: ['Are you KIDDING me?', 'Nope. Absolutely not.'],
    win: ['Say my name. Amber. M.']
  },
  'Flo': {
    qsGive: ['That’s yours now.', 'Don’t say I never gave you nothing.'],
    qsGet: ['Okay. I see how it is.', 'You picked the wrong one.'],
    breaks: ['Hearts. Let’s get serious.', 'Done playing nice.'],
    hearts: ['I can take it.', 'Keep ’em coming. I’m built for it.'],
    taunt: ['Next.', 'Is that all you got?'],
    moon: ['Every point. Every one.', 'Bow down. Twenty-six.'],
    moonVictim: ['Hm. Respect. Barely.', 'Nobody does that to Flo.'],
    win: ['Was there ever a question?']
  },
  'Kristen': {
    qsGive: ['Party favor! For you!', 'Pass the queen, pass the drinks.'],
    qsGet: ['Buzzkill.', 'Rude. I was having fun.'],
    breaks: ['Hearts are OPEN, baby!', 'Let’s make it a party.'],
    hearts: ['Okay, slow down.', 'Fine, I’ll take the hearts. Love me.'],
    taunt: ['Is it over yet? Kidding.', 'I’m having the best night.'],
    moon: ['Shot the moon! Drinks on me!', 'All twenty-six. Celebrate!'],
    moonVictim: ['That is not a vibe.', 'Party foul.'],
    win: ['Winner! Where’s the after-party?']
  },
  'Char': {
    qsGive: ['Wear her well.', 'She looks better on you.'],
    qsGet: ['I’ll remember your face.', 'Interesting choice.'],
    breaks: ['Hearts. Fashionably early.', 'Somebody had to start it.'],
    hearts: ['Not my best look.', 'I’ll make it work.'],
    taunt: ['Effortless.', 'Did you even try?'],
    moon: ['The whole moon. Obviously.', 'Twenty-six for everyone. You’re welcome.'],
    moonVictim: ['Rude. Iconic, but rude.', 'Who raised you?'],
    win: ['Confidence wins. Ask anybody.']
  },
  'Judi': {
    qsGive: ['Bless your heart.', 'Something for you, darling.'],
    qsGet: ['I don’t do ugly cards.', 'This queen does not match my outfit.'],
    breaks: ['Hearts. Elegantly.', 'Let’s raise the stakes, ladies.'],
    fewHearts: ['Just a little heart. Cute.', 'I’ll allow it.'],
    hearts: ['Still gorgeous.', 'Points look good on me.'],
    taunt: ['Flawless.', 'Take notes, sweetie.'],
    moon: ['The moon. Naturally.', 'Glamour shoots the moon.'],
    moonVictim: ['How tacky.', 'I’m not even mad. Okay, I’m mad.'],
    win: ['Judi wins. As expected.']
  },
  'Amy': {
    qsGive: ['Here you go, sweetie.', 'Enjoy her, babe.'],
    qsGet: ['Excuse me? Me?', 'Ugh. This is so not cute.'],
    breaks: ['Hearts are open, ladies.', 'Oops. Did I do that?'],
    fewHearts: ['Just a little heart. Whatever.', 'I’m still cute.'],
    hearts: ['Seriously? All of these?', 'This is so annoying.'],
    taunt: ['Too easy, sweetie.', 'Bye.'],
    moon: ['All of it, babe. Every point.', 'Moon. Shot. Hello.'],
    moonVictim: ['Are you serious right now?', 'That is so rude.'],
    win: ['Obviously.']
  },
  'Victor Twins': {
    qsGive: ['Double trouble. For you.', 'We agreed. You get her.'],
    qsGet: ['Us? Seriously? Both of us?', 'You came for the wrong twins.'],
    breaks: ['Two hearts are better than one.', 'We said open it. So we did.'],
    fewHearts: ['One for each of us.', 'We barely felt that.'],
    hearts: ['We’ll split it.', 'Twice the points, twice the attitude.'],
    taunt: ['Two against three. Still winning.', 'Twin magic.'],
    moon: ['Twin moon! All twenty-six!', 'We planned that. Together.'],
    moonVictim: ['We both hate this.', 'Unbelievable. Times two.'],
    win: ['The twins take it. Obviously.']
  },
  'Lucci Vee': {
    qsGive: ['Here go your queen.', 'Catch!'],
    qsGet: ['Oh, it’s like that?', 'Bet. I’ll remember.'],
    breaks: ['Hearts open. Run it.', 'Let’s get messy.'],
    hearts: ['I’m still the baddest here.', 'Points don’t scare me.'],
    taunt: ['Too smooth.', 'Watch and learn.'],
    moon: ['Shot the whole moon. Lucci did that.', 'Run me my twenty-six.'],
    moonVictim: ['Nah. Nah nah nah.', 'That’s crazy.'],
    win: ['Lucci Vee. Remember it.']
  },
  'Rocky': {
    qsGive: ['Special delivery.', 'You looked lonely. Here.'],
    qsGet: ['Oh, now I’m locked in.', 'Bad move. Bad, bad move.'],
    breaks: ['Hearts. Let’s rumble.', 'No more warm-ups.'],
    hearts: ['I’m not folding.', 'That’s it? Bring more.'],
    taunt: ['Light work.', 'Stay ready.'],
    moon: ['Knocked out the moon.', 'All twenty-six. Down you go.'],
    moonVictim: ['That was a cheap shot.', 'I want a rematch.'],
    win: ['Undisputed.']
  },
  'Sarah': {
    qsGive: ['Strategy, darling.', 'That’s called a play.'],
    qsGet: ['Second place is not my thing.', 'Calculated. By you, sadly.'],
    breaks: ['Hearts. Right on schedule.', 'I play to win.'],
    hearts: ['Part of the plan.', 'I’ll make it back.'],
    taunt: ['Checkmate energy.', 'I came to compete.'],
    moon: ['Twenty-six. Planned it from the deal.', 'The moon was the plan all along.'],
    moonVictim: ['Okay. Well played. Ugh.', 'I’m writing that down.'],
    win: ['Not runner-up this time.']
  },
  'Natalie': {
    qsGive: ['The queen gives the queen.', 'Bow. Then take her.'],
    qsGet: ['You gave ME the queen? I AM the queen.', 'Somebody’s getting kicked out the house.'],
    breaks: ['Hearts open when I say so.', 'My table. My rules.'],
    fewHearts: ['A heart or two. Barely a scratch.', 'Is that supposed to hurt?'],
    hearts: ['I own this house anyway.', 'Points? Cute.'],
    taunt: ['Know your place.', 'Who runs this? Exactly.'],
    moon: ['The whole moon belongs to me.', 'Twenty-six. Kiss the ring.'],
    moonVictim: ['Who approved this?', 'Not in my house.'],
    win: ['The queen keeps the crown.']
  },
  'Tanisha': {
    qsGive: ['Here you go, baby! Enjoy!', 'Nope! Not keeping that!'],
    qsGet: ['Why is everybody looking at ME?', 'I did not sign up for this!'],
    breaks: ['Hearts are open, everybody! Wake up!', 'Somebody gotta start the party!'],
    hearts: ['I’m not even mad. I’m a LITTLE mad.', 'Okay, that one hurt.'],
    taunt: ['Y’all ain’t ready.', 'That’s how a host does it.'],
    moon: ['I SHOT THE MOON! Everybody up!', 'Twenty-six for everybody but me!'],
    moonVictim: ['No! No ma’am!', 'I’m calling a house meeting.'],
    win: ['Tanisha wins! Somebody get my crown!']
  }
};
// Lines for anyone without her own set yet
const GENERIC_LINES = {
  qsGive: ['She’s all yours.', 'Enjoy, sweetie.'],
  qsGet: ['Who did this?', 'Oh, it’s like that?'],
  breaks: ['Hearts are open.', 'Let’s get messy.'],
  fewHearts: ['Just a scratch.', 'I’ll live.'],
  hearts: ['Fine. I’ll take them.', 'That one hurt.'],
  taunt: ['Too easy.', 'Watch and learn.'],
  moon: ['The whole moon. Twenty-six each.', 'All of it!'],
  moonVictim: ['Are you kidding me?', 'That was rude.'],
  win: ['Crown me.']
};
// Your clips drop in here later: CLIPS[name][event] = ['clips/flo-qsget-1.mp3', ...]
const CLIPS = {};
// ===== end reactions =====
