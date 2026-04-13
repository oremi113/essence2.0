/**
 * ESSENCE Voice Training Script — V2 (Phonetic Hardening Pass 1)
 *
 * 25 prompts · 3 stages · all dynamic variants included.
 * Placeholders: {userName}, {city}
 *
 * Source of truth: ESSENCE_voice_training_script_V2.md
 * Do NOT edit prompt text here without updating the doc.
 */
import type { VoiceStage } from "./types";

export const TOTAL_PROMPT_COUNT = 25;

export const voiceTrainingScript: VoiceStage[] = [
  // ===================================================================
  // STAGE 1 — Quick Start: Let’s Meet Your Voice (prompts 1-5)
  // ===================================================================
  {
    stage: 1,
    startIndex: 0,
    endIndex: 4,
    title: "Quick Start - Let’s Meet Your Voice",
    description: "Record 5 warm greetings to start training your voice",
    estimatedTime: "3-4 minutes",
    prompts: [
      // ---------------------------------------------------------------
      // Prompt 1 — timeOfDayName
      // ---------------------------------------------------------------
      {
        id: 1,
        instruction:
          "Start with a warm, natural greeting. Talk like you’re meeting a friend.",
        emotionalTone: "warm/welcoming",
        lineType: "timeOfDayName",
        line: {
          morning:
            "Good morning! My name is {userName}, and I’m here in {city}. It’s a beautiful morning, and I’m excited to be doing this. This is actually kind of fun! How does my voice sound so far?",
          afternoon:
            "Hi there! I’m {userName}, and I’m calling in from {city}. It’s the middle of the afternoon here, and I figured this was a good time to sit down and try this out. Here we go!",
          evening:
            "Hey! I’m {userName}, and I’m here in {city}. It’s evening now, end of the day, and I’m finally sitting down to record this. Better late than never, right? Let’s do this.",
          lateNight:
            "Hi! I’m {userName} from {city}. I know, I know, it’s late. But I’m a night owl, and this felt like the perfect time to do this. So here we are. Let’s get started.",
        },
        celebration: {
          title: "Beautiful",
          titleWeight: 400,
          subtitle: "You opened the door. Your voice is here.",
          cta: "Continue",
          next: { kind: "next-prompt" },
        },
      },
      // ---------------------------------------------------------------
      // Prompt 2 — simple
      // ---------------------------------------------------------------
      {
        id: 2,
        instruction:
          "Talk about something simple that makes you happy. Keep it light and genuine.",
        emotionalTone: "content/happy",
        lineType: "simple",
        line: "You know what I secretly love? A big thunderstorm. When the sky goes dark in the middle of the afternoon and the wind picks up and you can just feel it coming. That first crack of thunder, the flash of lightning through the trees. Then the rain hits — just crashes down, all at once. I love sitting by the window and watching it. The streaks of water on the glass, the way everything outside looks blurred and strange. There’s something about a storm that makes you feel small, but in a good way. Like the world’s reminding you it’s bigger than your problems. I find that really comforting, actually.",
      },
      // ---------------------------------------------------------------
      // Prompt 3 — city
      // ---------------------------------------------------------------
      {
        id: 3,
        instruction:
          "Share a quick story about your day or week. Be casual and natural.",
        emotionalTone: "conversational",
        lineType: "city",
        line: "So this week has been pretty good, actually. I got out for a walk around {city}, which was nice. The weather’s been surprisingly nice, and it felt good to get some fresh air and stretch my legs. Nothing too exciting, just life. But sometimes those quiet, normal days are exactly what you need, you know?",
      },
      // ---------------------------------------------------------------
      // Prompt 4 — city
      // ---------------------------------------------------------------
      {
        id: 4,
        instruction:
          "Talk about a place you love. Let yourself get a little nostalgic.",
        emotionalTone: "reflective/warm",
        lineType: "city",
        line: "There’s this spot in {city} that I really love. It’s nothing fancy, just a quiet place where I can sit and think. Maybe it’s a shady park bench, maybe it’s a quiet coffee shop corner with a scratched-up table, doesn’t really matter. But when I’m there, everything just feels peaceful. Everyone needs a place like that, you know? Somewhere you can just breathe and be yourself.",
      },
      // ---------------------------------------------------------------
      // Prompt 5 — simple
      // ---------------------------------------------------------------
      {
        id: 5,
        instruction:
          "End this first stage with encouragement. Sound warm and supportive.",
        emotionalTone: "encouraging/warm",
        lineType: "simple",
        line: "You know what? If you’re listening to this, I just want you to know something. Whatever you’re going through right now, you’re doing better than you think. I mean that. Life’s hard sometimes, and it’s exhausting, but you’re here. You’re still showing up. And that counts for something. So give yourself some credit, okay? You’ve earned it.",
        celebration: {
          eyebrow: "MILESTONE",
          title: "Stage 1 Complete",
          titleWeight: 500,
          subtitle:
            "You shaped the first five moments. Your voice record is beginning to form.",
          showStageMap: true,
          stageMapCurrent: 2,
          showPauseLink: true,
          cta: "Begin Stage 2",
          next: { kind: "stage-intro", stage: 2 },
        },
      },
    ],
    completionMessage: {
      title: "🎉 Great Start!",
      body: "You’ve completed Stage 1! Your voice is starting to take shape.",
      progress: "20% Complete",
      cta: "Continue to Stage 2",
      alternativeCta: "Save & Finish Later",
    },
  },

  // ===================================================================
  // STAGE 2 — Build Emotion: Capture Your Range (prompts 6-17)
  // ===================================================================
  {
    stage: 2,
    startIndex: 5,
    endIndex: 16,
    title: "Build Emotion - Capture Your Range",
    description: "Record 12 prompts with different emotions and stories",
    estimatedTime: "5-6 minutes",
    prompts: [
      // ---------------------------------------------------------------
      // Prompt 6 — generation
      // ---------------------------------------------------------------
      {
        id: 6,
        instruction:
          "Share a childhood memory. Let yourself get nostalgic.",
        emotionalTone: "nostalgic/reflective",
        lineType: "generation",
        line: {
          "1950s":
            "I remember summer days in the fifties. We’d play outside from morning till night, until the streetlights came on. No phones, no screens, just us kids running around the neighborhood. And you know what? We were perfectly happy. Those were simpler times, but they were good times. Really good times.",
          "1960s":
            "Growing up in the sixties, everything felt like it was changing. The music, the culture, the whole world was shifting. My parents didn’t always understand it, but we felt like we were part of something bigger, you know? Looking back now, those were electric times. I’m glad I got to see it all happen.",
          "1970s":
            "I remember the seventies so clearly. We’d ride bikes everywhere, no helmets, no worries. We’d stay out until it got dark, and nobody really worried about it the way they do now. Different times, you know? But man, I have such good memories from back then. Wouldn’t trade them for anything.",
          "1980s":
            "The eighties were wild. Big hair, bright colors, MTV actually playing music videos all day long. We had to wait all week to watch our favorite TV show. No streaming, no recording. If you missed it, you missed it. But somehow that made it more special, you know? We appreciated things more.",
          "1990s":
            "Growing up in the nineties, we were right on that edge. The internet was starting, but we still went outside and hung out in person. We’d make plans without texting, just show up at someone’s house and see if they were home. Seems crazy now, but it worked. Those were good times.",
          "2000s":
            "Being a kid in the two thousands was different. YouTube, social media, smartphones, it was all starting to take off. My childhood looks so different from my parents’. But you know what? It’s the only one I knew, and I wouldn’t trade it. Every generation has their thing, and that was ours.",
          default:
            "I remember when I was a kid. Summer days that felt endless, playing outside, laughing until our stomachs hurt. We didn’t have much, but we had each other, and honestly? That was enough. Those simple moments, those are the memories I hold onto. Those are the ones that matter.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 7 — simple
      // ---------------------------------------------------------------
      {
        id: 7,
        instruction:
          "Talk about someone who’s always been there for you. Get a little emotional.",
        emotionalTone: "grateful/emotional",
        lineType: "simple",
        line: "There’s this person in my life who’s always been there for me. Through the good times and the bad times, they never wavered. Never gave up on me, even when I probably gave them plenty of reasons to. They taught me what real loyalty looks like, what friendship actually means. I don’t know where I’d be without them. Honestly, I don’t even want to think about it.",
      },
      // ---------------------------------------------------------------
      // Prompt 8 — generation
      // ---------------------------------------------------------------
      {
        id: 8,
        instruction:
          "Give advice to your younger self. Be honest and real.",
        emotionalTone: "wise/reflective",
        lineType: "generation",
        line: {
          "1950s":
            "If I could go back and talk to my younger self, I’d say this: Stop trying so hard to fit in. The world’s changing faster than you realize, and the people who matter won’t care about that stuff anyway. Just be yourself. Trust your instincts. It’ll work out better than you think.",
          "1960s":
            "What would I tell my younger self? Don’t worry so much about what everyone thinks. You’re living through incredible times. The revolution isn’t just out there in the world, it’s inside you too. Trust your gut, do what feels right, and you’ll be fine. Better than fine, actually.",
          "1970s":
            "If I could tell my younger self anything, it’d be this: Stop worrying so much about everything. Life doesn’t go according to plan, and that’s okay. Actually, that’s more than okay. Some of the best things that happened to me were the ones I never saw coming. Just relax and trust the process.",
          "1980s":
            "I’d tell my younger self: Take more risks. You’re young, you can afford to mess up. Don’t play it so safe all the time. The biggest regrets you’ll have aren’t the things you did wrong, they’re the things you were too scared to try. So go for it. What’s the worst that could happen?",
          "1990s":
            "Here’s what I’d tell my younger self: Stop stressing so much about the future. Technology’s going to change everything, but you’ll figure it out. Everyone does. Just focus on what’s right in front of you, enjoy the moment, and the rest will fall into place. I promise.",
          "2000s":
            "If I could go back, I’d tell myself: Get off social media more. Seriously. Real life is happening around you, and the people in front of you matter way more than the people online. Don’t miss out on actual moments because you’re worried about posting them. Be present.",
          default:
            "What would I tell my younger self? Simple. Stop worrying so much about what other people think. Life’s too short for that. Do what makes you happy. Trust your gut. Follow your heart. And guess what? It’s all going to work out fine. Better than you ever imagined.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 9 — simple
      // ---------------------------------------------------------------
      {
        id: 9,
        instruction:
          "Share a moment when you felt really proud of yourself.",
        emotionalTone: "proud/accomplished",
        lineType: "simple",
        line: "I remember this one time when I finally did something I’d been scared to do for years. And when it was done, when I’d actually pulled it off, I just stood there, struck silent, thinking, ‘I did it. I really did it.’ That feeling of realizing you’re stronger than you thought? Braver than you gave yourself credit for? That’s something you don’t forget. That stays with you.",
      },
      // ---------------------------------------------------------------
      // Prompt 10 — city
      // ---------------------------------------------------------------
      {
        id: 10,
        instruction:
          "Talk about what a perfect day looks like for you. Sound content and happy.",
        emotionalTone: "content/happy",
        lineType: "city",
        line: "My perfect day? It’s actually pretty simple. I’d wake up without an alarm, make a really good cup of coffee, and just take my time with breakfast. No rush, no stress. Then maybe take a walk around {city}, enjoy the weather, clear my head. Later, I’d spend time with people I love. Maybe cook a nice dinner together, nothing fancy. Just good food, good company, good conversation. That’s it. That’s my perfect day. What about you — what does yours look like?",
      },
      // ---------------------------------------------------------------
      // Prompt 11 — simple
      // ---------------------------------------------------------------
      {
        id: 11,
        instruction:
          "Share something you’re genuinely grateful for. Mean it.",
        emotionalTone: "grateful/warm",
        lineType: "simple",
        line: "You know what I’m really grateful for? The people in my life who’ve stuck around. The ones who’ve seen me at my worst and didn’t run away. The ones who celebrate with me when things are good and stay close when things get strange and hard. That’s real. That’s what matters. And I don’t say it enough, but I’m grateful for every single one of them.",
      },
      // ---------------------------------------------------------------
      // Prompt 12 — simple
      // ---------------------------------------------------------------
      {
        id: 12,
        instruction:
          "Share your secret for making something simple and delicious. Talk like you’re teaching someone you love.",
        emotionalTone: "warm/teaching",
        lineType: "simple",
        line: "You want to know my secret for a great breakfast? Start with fresh scrambled eggs. Crack three into a bowl, splash in some milk, just a little. Whisk it up until it’s smooth. Then get your skillet hot — not screaming hot, just sizzling. Drop in some butter, swirl it around, pour the eggs in, and stir them gently. Slowly. Don’t rush it. That’s the trick. Patience. Sprinkle a little salt, maybe some pepper, and you’ve got something special. Simple, but special. Just like the best things in life.",
        celebration: {
          title: "You’re halfway there",
          titleWeight: 400,
          subtitle: "Your voice is unfolding beautifully",
          cta: "Continue",
          next: { kind: "next-prompt" },
        },
      },
      // ---------------------------------------------------------------
      // Prompt 13 — simple
      // ---------------------------------------------------------------
      {
        id: 13,
        instruction:
          "Talk about a time you were scared but did it anyway.",
        emotionalTone: "vulnerable/brave",
        lineType: "simple",
        line: "I remember being absolutely terrified before doing something I’d never done before. My hands were shaking, my chest was tight, my heart was pounding, and I kept thinking, ‘What if I fail? What if this goes horribly wrong?’ But I did it anyway. And you know what? It turned out okay. Not perfect, but okay. And I learned something important that day: Being scared doesn’t mean you can’t do it. It just means it matters.",
      },
      // ---------------------------------------------------------------
      // Prompt 14 — simple
      // ---------------------------------------------------------------
      {
        id: 14,
        instruction:
          "Tell us about a time you got news that made you incredibly happy. Let the joy come through.",
        emotionalTone: "excited/joyful",
        lineType: "simple",
        line: "I’ll never forget getting news that completely knocked me sideways — in the best possible way. I just stood there for a second, trying to process it, and then this wave of joy hit me all at once. I grabbed the phone, started calling people, tripping over my words, laughing before I could even finish the sentence. That kind of happiness — the kind that just floods through you before you can even think — that’s the good stuff. That’s what life’s really about.",
      },
      // ---------------------------------------------------------------
      // Prompt 15 — simple
      // ---------------------------------------------------------------
      {
        id: 15,
        instruction:
          "Share what you’ve learned about what really matters in life.",
        emotionalTone: "reflective/wise",
        lineType: "simple",
        line: "Here’s what I’ve figured out after all these years. What really matters isn’t the big stuff. It’s not the job title or the house or the car. It’s the people. It’s the moments. It’s the late-night conversations, the shared meals, the inside jokes. That’s what you remember. That’s what makes life worth living. The rest is just noise.",
      },
      // ---------------------------------------------------------------
      // Prompt 16 — simple
      // ---------------------------------------------------------------
      {
        id: 16,
        instruction:
          "Tell someone you believe in them. Sound confident and warm.",
        emotionalTone: "encouraging/confident",
        lineType: "simple",
        line: "Hey, I want you to know something. I believe in you. I know you’re doubting yourself right now, wondering if you can do this, but I’ve seen what you’re capable of. You’re stronger than you think. You’ve got this. Even when it feels impossible, even when you want to give up, keep going. You’re going to make it. I know you are.",
      },
      // ---------------------------------------------------------------
      // Prompt 17 — simple
      // ---------------------------------------------------------------
      {
        id: 17,
        instruction:
          "Share what you’ve learned about love over the years.",
        emotionalTone: "wise/warm",
        lineType: "simple",
        line: "Here’s what I’ve learned about love over the years. It’s not always fireworks and grand gestures. Most of the time, it’s quiet. It’s small, steady, and consistent. It’s showing up. It’s being there when it’s hard. It’s choosing each other, over and over again, even on the days when it’s not easy. The movies got it all wrong. Real love is in the everyday moments, the little things. That’s where the magic actually is.",
        celebration: {
          eyebrow: "MILESTONE",
          title: "Stage 2 Complete",
          titleWeight: 400,
          subtitle:
            "Your voice has gained depth and warmth. The final stage awaits.",
          showStageMap: true,
          stageMapCurrent: 3,
          showPauseLink: true,
          cta: "Begin Stage 3",
          next: { kind: "stage-intro", stage: 3 },
        },
      },
    ],
    completionMessage: {
      title: "⭐ Excellent Work!",
      body: "You’re capturing so much emotion! Your voice is really taking shape now.",
      progress: "68% Complete",
      cta: "Finish Strong - Stage 3",
      alternativeCta: "Save & Finish Later",
    },
  },

  // ===================================================================
  // STAGE 3 — Final Touch: Complete Your Voice (prompts 18-25)
  // ===================================================================
  {
    stage: 3,
    startIndex: 17,
    endIndex: 24,
    title: "Final Touch - Complete Your Voice",
    description: "Record the final 8 prompts to finish your voice training",
    estimatedTime: "3-4 minutes",
    prompts: [
      // ---------------------------------------------------------------
      // Prompt 18 — relationship
      // ---------------------------------------------------------------
      {
        id: 18,
        instruction:
          "Speak directly to the person you’re recording for. Be genuine and loving.",
        emotionalTone: "loving/intimate",
        lineType: "relationship",
        line: {
          daughter:
            "Sweetheart, I want you to know something. I’m so proud of the woman you’ve become. You’re strong, you’re kind, you’re everything I hoped you’d be and so much more. Keep being exactly who you are. The world needs more people like you. I love you so, so much.",
          son:
            "Buddy, I need to tell you something. You’ve grown into an incredible man. I’m so proud of who you are, the choices you’re making, the person you’re becoming. Keep trusting yourself. Keep being you. You’re doing great, and I believe in you. Always have, always will. Love you, son.",
          spouse:
            "Hey love, I don’t say this enough, but you’re my person. You’ve seen me at my best and my worst, and you’re still here. That means everything to me. I love you. Even when you drive me crazy. Especially then, actually. You make life better, and I’m grateful for you every single day.",
          grandchild:
            "Hey kiddo, I want you to know something really important. You are so, so loved. More than you could ever imagine. Whatever happens in life, wherever you go, whatever you do, remember that. You’ve got people cheering for you, believing in you. And I’m one of them. I love you so much, sweetheart.",
          friend:
            "My friend, I just want to say thank you. For being there, for listening, for making me laugh when I needed it most. You’ve seen me through some stuff, and you never bailed. That’s rare, and I don’t take it for granted. You’re one of the good ones. Love you, friend.",
          parent:
            "I don’t say this enough, but thank you. For everything. For all the sacrifices you made, all the times you put me first, all the love you gave even when I didn’t deserve it. I see it now, and I’m so grateful. You shaped who I am, and I hope I make you proud. Love you so much.",
          default:
            "I want you to know you’re special to me. Really special. And I’m so glad you’re in my life. Whatever happens, whatever you’re going through, remember that you matter. You’re loved. And I’m always here for you. Always.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 19 — relationship
      // ---------------------------------------------------------------
      {
        id: 19,
        instruction:
          "Say goodnight to the person you’re recording for. Speak softly, like they’re falling asleep.",
        emotionalTone: "tender/intimate",
        lineType: "relationship",
        line: {
          daughter:
            "Sweetie, close your eyes. You’re safe. Everything’s okay. I’m right here. You know what I used to do when you were tiny? I’d just sit by your bed and watch you breathe. In and out, so peaceful. The whole world was chaotic and rushed and noisy, but right there? In that little room? Everything was perfectly still. That’s how I want you to feel whenever you hear this. Peaceful. Protected. Loved. Goodnight, sweetheart. Sleep well.",
          son:
            "Hey buddy, settle in. You’re okay. Everything’s okay. When you were little, I used to sit right next to your bed after you’d fallen asleep. Just watching you breathe, so calm and peaceful. The whole world outside was loud and chaotic, but in that room? Everything was still. I want you to feel that right now. Safe. Steady. Loved. Goodnight, son. Sleep well.",
          spouse:
            "Hey love, close your eyes. I’m right here. You know what I think about sometimes? Those nights when we’d just lie there talking about nothing until one of us drifted off. No agenda, no stress, just us. The world was quiet and everything felt exactly right. That’s what I want you to feel right now. Calm. Warm. Loved. Goodnight, my love. Sleep well.",
          grandchild:
            "Okay little one, it’s time to rest. Close your eyes. You’re safe, you’re warm, and you are so loved. You know what? When you sleep, I think the stars are watching over you. Every single one. And so am I, in my own way. So dream big, beautiful dreams. I’ll be right here. Goodnight, sweetheart. I love you to the moon and back.",
          friend:
            "Hey friend, I know it’s been a long day. Take a breath. Let it all go for a minute. You don’t have to fix anything tonight. You don’t have to be strong right now. Just rest. You’ve done enough today. More than enough. I’m proud of you, even if you don’t feel like you earned it. You did. Goodnight, my friend. Rest easy.",
          parent:
            "Hey, it’s me. I hope you’re resting. You’ve done so much — more than you probably realize. All those years of taking care of everyone else, I just want you to know: you can rest now. Close your eyes. Everything’s okay. I’m here, and I love you. More than I always say. Goodnight. Sleep well. I’ll talk to you soon.",
          default:
            "Hey, close your eyes for a minute. Everything’s okay. Whatever happened today, you made it through. And that’s enough. You don’t have to carry anything right now. Just breathe. Let everything get quiet. You’re safe, you’re cared for, and tomorrow’s a fresh start. Goodnight. Sleep well. I’m glad you’re here.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 20 — city
      // ---------------------------------------------------------------
      {
        id: 20,
        instruction: "Talk about what home means to you.",
        emotionalTone: "reflective/warm",
        lineType: "city",
        line: "When I think about home, it’s not really about a place. I mean, sure, I love {city}, but home is more than that. Home is where the people are. It’s that feeling when you walk in and everything just feels right. It’s where you can be yourself, completely, without any masks or pretending. That’s home. And I’m really lucky to have that.",
      },
      // ---------------------------------------------------------------
      // Prompt 21 — simple
      // ---------------------------------------------------------------
      {
        id: 21,
        instruction:
          "Share a piece of simple wisdom. Keep it real.",
        emotionalTone: "wise/warm",
        lineType: "simple",
        line: "Here’s something I wish someone had told me when I was younger. Be kind. To others, yes, but also to yourself. We’re all doing the best we can with what we have. Nobody’s perfect. We all mess up. And that’s okay. So be patient with yourself. Give yourself the same grace you’d give to someone you love. You deserve that too.",
      },
      // ---------------------------------------------------------------
      // Prompt 22 — simple
      // ---------------------------------------------------------------
      {
        id: 22,
        instruction:
          "For voice quality: Count clearly and warmly, like teaching someone.",
        emotionalTone: "teaching/warm",
        lineType: "simple",
        line: "Okay, let’s count together. Ready? One, two, three, four, five, six, seven, eight, nine, ten. Good! Now let’s go backwards. Ten, nine, eight, seven, six, five, four, three, two, one. Perfect! See? You’re really good at this. Want to try it one more time?",
      },
      // ---------------------------------------------------------------
      // Prompt 23 — city
      // ---------------------------------------------------------------
      {
        id: 23,
        instruction:
          "For voice quality: Say numbers, dates, and contact info clearly.",
        emotionalTone: "clear/neutral",
        lineType: "city",
        line: "Just so you have my information: You can reach me at five-five-five, two-one-two, three-four-five-six. My address is four-twenty-seven Oak Street, apartment two-B, {city}. And today’s date is March fifteenth, two thousand twenty-five, around three-thirty in the afternoon.",
      },
      // ---------------------------------------------------------------
      // Prompt 24 — simple
      // ---------------------------------------------------------------
      {
        id: 24,
        instruction:
          "Add a light moment of humor. Keep it natural.",
        emotionalTone: "playful/light",
        lineType: "simple",
        line: "You know what always makes me laugh? When everything goes wrong at once. Like, you spill your coffee, and then you slip on it, and then your phone rings and you grab it with your wet hand and it flies across the room, and the dog thinks it’s a toy so now he’s running off with it, and you’re chasing the dog in your socks on a wet floor. And somehow nobody’s around to see any of it. Or worse — everyone is. What do you even do at that point? You just have to stand there and laugh. Because life is ridiculous, and so are we.",
      },
      // ---------------------------------------------------------------
      // Prompt 25 — relationshipGoodbye
      // ---------------------------------------------------------------
      {
        id: 25,
        instruction:
          "End with a heartfelt, personalized goodbye. Make it count.",
        emotionalTone: "loving/warm",
        lineType: "relationshipGoodbye",
        line: {
          daughter:
            "Alright sweetheart, that’s everything. I love you so much. More than words can say. I’m always here for you, always in your corner, always cheering for you. Whatever you need, whatever happens, you’ve got me. Take care of yourself. I love you. Bye for now, kiddo.",
          son:
            "Okay buddy, I think we’re done. I’m proud of you. So incredibly proud. And I love you. Remember that when things get hard. You’ve got people who believe in you, and I’m at the top of that list. Take care, son. Love you. Talk soon.",
          spouse:
            "Alright love, that’s it. I love you. You know that, right? Even when I don’t say it enough, even when life gets crazy, I love you. You’re my favorite person, my best friend, my everything. Always have been. Take care of yourself. I’ll see you soon. Love you always.",
          grandchild:
            "Okay kiddo, that’s all from me for now. Remember: You’re so loved. So, so loved. Be good, have fun, and know you can always talk to me about anything. Anything at all. Love you to the moon and back, sweetheart. Bye for now!",
          friend:
            "Alright my friend, that’s a wrap. Thanks for being you. Thanks for being in my life. You make everything better, and I hope you know that. Take care of yourself, okay? I’ll talk to you soon. Love you, friend. Stay awesome. Bye!",
          parent:
            "Okay, I think that’s everything. I love you. Thank you for everything you’ve done for me, everything you’ve taught me, all the ways you’ve shaped who I am. I hope I make you proud. Take care of yourself. I’ll call you soon. Love you so much. Bye.",
          default:
            "Alright, that’s a wrap. Thank you for listening to all of this. I hope this brings you joy whenever you hear it. Remember you’re loved, you’re valued, and you’re doing better than you think. Take care of yourself. Love you. Bye for now!",
        },
        celebration: {
          eyebrow: "YOUR JOURNEY",
          title: "All 25 Moments Complete",
          subtitle: "You have shaped something that will endure",
          italicSubtitle: true,
          showStageMap: true,
          stageMapCurrent: 3,
          cta: "Continue",
          next: { kind: "working" },
        },
      },
    ],
    completionMessage: {
      title: "🏆 Congratulations!",
      body: "You did it! Your voice is fully trained and ready to create unlimited personalized messages.",
      progress: "100% Complete",
      cta: "Create Your First Message",
      celebration: "confetti",
    },
  },
];

// ─── FLAT PROMPT LIST ──────────────────────────────────────────────────────
// Computed once at module load — avoids repeated flatMap on every import.
export const ALL_PROMPTS = voiceTrainingScript.flatMap((stage) => stage.prompts);

// ─── STAGE BOUNDARY HELPERS ────────────────────────────────────────────────
// Derived from script metadata — no hardcoded index ranges in components.

/** Returns the stage number (1 | 2 | 3) for a zero-based prompt index. */
export function getStageForPrompt(promptIndex: number): 1 | 2 | 3 {
  for (const stage of voiceTrainingScript) {
    if (promptIndex >= stage.startIndex && promptIndex <= stage.endIndex) {
      return stage.stage;
    }
  }
  // Fallback — should not happen with a well-formed script.
  return 3;
}

/** Returns the zero-based start index of the given stage. */
export function getStageStartIndex(stage: 1 | 2 | 3): number {
  const found = voiceTrainingScript.find((s) => s.stage === stage);
  return found?.startIndex ?? 0;
}
