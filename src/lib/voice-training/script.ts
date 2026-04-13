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
  // STAGE 1 — Quick Start: Let's Meet Your Voice (prompts 1-5)
  // ===================================================================
  {
    stage: 1,
    title: "Quick Start - Let\u2019s Meet Your Voice",
    description: "Record 5 warm greetings to start training your voice",
    estimatedTime: "3-4 minutes",
    prompts: [
      // ---------------------------------------------------------------
      // Prompt 1 — timeOfDayName
      // ---------------------------------------------------------------
      {
        id: 1,
        instruction:
          "Start with a warm, natural greeting. Talk like you\u2019re meeting a friend.",
        emotionalTone: "warm/welcoming",
        lineType: "timeOfDayName",
        line: {
          morning:
            "Good morning! My name is {userName}, and I\u2019m here in {city}. It\u2019s a beautiful morning, and I\u2019m excited to be doing this. This is actually kind of fun! How does my voice sound so far?",
          afternoon:
            "Hi there! I\u2019m {userName}, and I\u2019m calling in from {city}. It\u2019s the middle of the afternoon here, and I figured this was a good time to sit down and try this out. Here we go!",
          evening:
            "Hey! I\u2019m {userName}, and I\u2019m here in {city}. It\u2019s evening now, end of the day, and I\u2019m finally sitting down to record this. Better late than never, right? Let\u2019s do this.",
          lateNight:
            "Hi! I\u2019m {userName} from {city}. I know, I know, it\u2019s late. But I\u2019m a night owl, and this felt like the perfect time to do this. So here we are. Let\u2019s get started.",
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
        line: "You know what I secretly love? A big thunderstorm. When the sky goes dark in the middle of the afternoon and the wind picks up and you can just feel it coming. That first crack of thunder, the flash of lightning through the trees. Then the rain hits \u2014 just crashes down, all at once. I love sitting by the window and watching it. The streaks of water on the glass, the way everything outside looks blurred and strange. There\u2019s something about a storm that makes you feel small, but in a good way. Like the world\u2019s reminding you it\u2019s bigger than your problems. I find that really comforting, actually.",
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
        line: "So this week has been pretty good, actually. I got out for a walk around {city}, which was nice. The weather\u2019s been surprisingly nice, and it felt good to get some fresh air and stretch my legs. Nothing too exciting, just life. But sometimes those quiet, normal days are exactly what you need, you know?",
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
        line: "There\u2019s this spot in {city} that I really love. It\u2019s nothing fancy, just a quiet place where I can sit and think. Maybe it\u2019s a shady park bench, maybe it\u2019s a quiet coffee shop corner with a scratched-up table, doesn\u2019t really matter. But when I\u2019m there, everything just feels peaceful. Everyone needs a place like that, you know? Somewhere you can just breathe and be yourself.",
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
        line: "You know what? If you\u2019re listening to this, I just want you to know something. Whatever you\u2019re going through right now, you\u2019re doing better than you think. I mean that. Life\u2019s hard sometimes, and it\u2019s exhausting, but you\u2019re here. You\u2019re still showing up. And that counts for something. So give yourself some credit, okay? You\u2019ve earned it.",
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
      title: "\ud83c\udf89 Great Start!",
      body: "You\u2019ve completed Stage 1! Your voice is starting to take shape.",
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
            "I remember summer days in the fifties. We\u2019d play outside from morning till night, until the streetlights came on. No phones, no screens, just us kids running around the neighborhood. And you know what? We were perfectly happy. Those were simpler times, but they were good times. Really good times.",
          "1960s":
            "Growing up in the sixties, everything felt like it was changing. The music, the culture, the whole world was shifting. My parents didn\u2019t always understand it, but we felt like we were part of something bigger, you know? Looking back now, those were electric times. I\u2019m glad I got to see it all happen.",
          "1970s":
            "I remember the seventies so clearly. We\u2019d ride bikes everywhere, no helmets, no worries. We\u2019d stay out until it got dark, and nobody really worried about it the way they do now. Different times, you know? But man, I have such good memories from back then. Wouldn\u2019t trade them for anything.",
          "1980s":
            "The eighties were wild. Big hair, bright colors, MTV actually playing music videos all day long. We had to wait all week to watch our favorite TV show. No streaming, no recording. If you missed it, you missed it. But somehow that made it more special, you know? We appreciated things more.",
          "1990s":
            "Growing up in the nineties, we were right on that edge. The internet was starting, but we still went outside and hung out in person. We\u2019d make plans without texting, just show up at someone\u2019s house and see if they were home. Seems crazy now, but it worked. Those were good times.",
          "2000s":
            "Being a kid in the two thousands was different. YouTube, social media, smartphones, it was all starting to take off. My childhood looks so different from my parents\u2019. But you know what? It\u2019s the only one I knew, and I wouldn\u2019t trade it. Every generation has their thing, and that was ours.",
          default:
            "I remember when I was a kid. Summer days that felt endless, playing outside, laughing until our stomachs hurt. We didn\u2019t have much, but we had each other, and honestly? That was enough. Those simple moments, those are the memories I hold onto. Those are the ones that matter.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 7 — simple
      // ---------------------------------------------------------------
      {
        id: 7,
        instruction:
          "Talk about someone who\u2019s always been there for you. Get a little emotional.",
        emotionalTone: "grateful/emotional",
        lineType: "simple",
        line: "There\u2019s this person in my life who\u2019s always been there for me. Through the good times and the bad times, they never wavered. Never gave up on me, even when I probably gave them plenty of reasons to. They taught me what real loyalty looks like, what friendship actually means. I don\u2019t know where I\u2019d be without them. Honestly, I don\u2019t even want to think about it.",
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
            "If I could go back and talk to my younger self, I\u2019d say this: Stop trying so hard to fit in. The world\u2019s changing faster than you realize, and the people who matter won\u2019t care about that stuff anyway. Just be yourself. Trust your instincts. It\u2019ll work out better than you think.",
          "1960s":
            "What would I tell my younger self? Don\u2019t worry so much about what everyone thinks. You\u2019re living through incredible times. The revolution isn\u2019t just out there in the world, it\u2019s inside you too. Trust your gut, do what feels right, and you\u2019ll be fine. Better than fine, actually.",
          "1970s":
            "If I could tell my younger self anything, it\u2019d be this: Stop worrying so much about everything. Life doesn\u2019t go according to plan, and that\u2019s okay. Actually, that\u2019s more than okay. Some of the best things that happened to me were the ones I never saw coming. Just relax and trust the process.",
          "1980s":
            "I\u2019d tell my younger self: Take more risks. You\u2019re young, you can afford to mess up. Don\u2019t play it so safe all the time. The biggest regrets you\u2019ll have aren\u2019t the things you did wrong, they\u2019re the things you were too scared to try. So go for it. What\u2019s the worst that could happen?",
          "1990s":
            "Here\u2019s what I\u2019d tell my younger self: Stop stressing so much about the future. Technology\u2019s going to change everything, but you\u2019ll figure it out. Everyone does. Just focus on what\u2019s right in front of you, enjoy the moment, and the rest will fall into place. I promise.",
          "2000s":
            "If I could go back, I\u2019d tell myself: Get off social media more. Seriously. Real life is happening around you, and the people in front of you matter way more than the people online. Don\u2019t miss out on actual moments because you\u2019re worried about posting them. Be present.",
          default:
            "What would I tell my younger self? Simple. Stop worrying so much about what other people think. Life\u2019s too short for that. Do what makes you happy. Trust your gut. Follow your heart. And guess what? It\u2019s all going to work out fine. Better than you ever imagined.",
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
        line: "I remember this one time when I finally did something I\u2019d been scared to do for years. And when it was done, when I\u2019d actually pulled it off, I just stood there, struck silent, thinking, \u2018I did it. I really did it.\u2019 That feeling of realizing you\u2019re stronger than you thought? Braver than you gave yourself credit for? That\u2019s something you don\u2019t forget. That stays with you.",
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
        line: "My perfect day? It\u2019s actually pretty simple. I\u2019d wake up without an alarm, make a really good cup of coffee, and just take my time with breakfast. No rush, no stress. Then maybe take a walk around {city}, enjoy the weather, clear my head. Later, I\u2019d spend time with people I love. Maybe cook a nice dinner together, nothing fancy. Just good food, good company, good conversation. That\u2019s it. That\u2019s my perfect day. What about you \u2014 what does yours look like?",
      },
      // ---------------------------------------------------------------
      // Prompt 11 — simple
      // ---------------------------------------------------------------
      {
        id: 11,
        instruction:
          "Share something you\u2019re genuinely grateful for. Mean it.",
        emotionalTone: "grateful/warm",
        lineType: "simple",
        line: "You know what I\u2019m really grateful for? The people in my life who\u2019ve stuck around. The ones who\u2019ve seen me at my worst and didn\u2019t run away. The ones who celebrate with me when things are good and stay close when things get strange and hard. That\u2019s real. That\u2019s what matters. And I don\u2019t say it enough, but I\u2019m grateful for every single one of them.",
      },
      // ---------------------------------------------------------------
      // Prompt 12 — simple
      // ---------------------------------------------------------------
      {
        id: 12,
        instruction:
          "Share your secret for making something simple and delicious. Talk like you\u2019re teaching someone you love.",
        emotionalTone: "warm/teaching",
        lineType: "simple",
        line: "You want to know my secret for a great breakfast? Start with fresh scrambled eggs. Crack three into a bowl, splash in some milk, just a little. Whisk it up until it\u2019s smooth. Then get your skillet hot \u2014 not screaming hot, just sizzling. Drop in some butter, swirl it around, pour the eggs in, and stir them gently. Slowly. Don\u2019t rush it. That\u2019s the trick. Patience. Sprinkle a little salt, maybe some pepper, and you\u2019ve got something special. Simple, but special. Just like the best things in life.",
        celebration: {
          title: "You\u2019re halfway there",
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
        line: "I remember being absolutely terrified before doing something I\u2019d never done before. My hands were shaking, my chest was tight, my heart was pounding, and I kept thinking, \u2018What if I fail? What if this goes horribly wrong?\u2019 But I did it anyway. And you know what? It turned out okay. Not perfect, but okay. And I learned something important that day: Being scared doesn\u2019t mean you can\u2019t do it. It just means it matters.",
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
        line: "I\u2019ll never forget getting news that completely knocked me sideways \u2014 in the best possible way. I just stood there for a second, trying to process it, and then this wave of joy hit me all at once. I grabbed the phone, started calling people, tripping over my words, laughing before I could even finish the sentence. That kind of happiness \u2014 the kind that just floods through you before you can even think \u2014 that\u2019s the good stuff. That\u2019s what life\u2019s really about.",
      },
      // ---------------------------------------------------------------
      // Prompt 15 — simple
      // ---------------------------------------------------------------
      {
        id: 15,
        instruction:
          "Share what you\u2019ve learned about what really matters in life.",
        emotionalTone: "reflective/wise",
        lineType: "simple",
        line: "Here\u2019s what I\u2019ve figured out after all these years. What really matters isn\u2019t the big stuff. It\u2019s not the job title or the house or the car. It\u2019s the people. It\u2019s the moments. It\u2019s the late-night conversations, the shared meals, the inside jokes. That\u2019s what you remember. That\u2019s what makes life worth living. The rest is just noise.",
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
        line: "Hey, I want you to know something. I believe in you. I know you\u2019re doubting yourself right now, wondering if you can do this, but I\u2019ve seen what you\u2019re capable of. You\u2019re stronger than you think. You\u2019ve got this. Even when it feels impossible, even when you want to give up, keep going. You\u2019re going to make it. I know you are.",
      },
      // ---------------------------------------------------------------
      // Prompt 17 — simple
      // ---------------------------------------------------------------
      {
        id: 17,
        instruction:
          "Share what you\u2019ve learned about love over the years.",
        emotionalTone: "wise/warm",
        lineType: "simple",
        line: "Here\u2019s what I\u2019ve learned about love over the years. It\u2019s not always fireworks and grand gestures. Most of the time, it\u2019s quiet. It\u2019s small, steady, and consistent. It\u2019s showing up. It\u2019s being there when it\u2019s hard. It\u2019s choosing each other, over and over again, even on the days when it\u2019s not easy. The movies got it all wrong. Real love is in the everyday moments, the little things. That\u2019s where the magic actually is.",
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
      title: "\u2b50 Excellent Work!",
      body: "You\u2019re capturing so much emotion! Your voice is really taking shape now.",
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
          "Speak directly to the person you\u2019re recording for. Be genuine and loving.",
        emotionalTone: "loving/intimate",
        lineType: "relationship",
        line: {
          daughter:
            "Sweetheart, I want you to know something. I\u2019m so proud of the woman you\u2019ve become. You\u2019re strong, you\u2019re kind, you\u2019re everything I hoped you\u2019d be and so much more. Keep being exactly who you are. The world needs more people like you. I love you so, so much.",
          son:
            "Buddy, I need to tell you something. You\u2019ve grown into an incredible man. I\u2019m so proud of who you are, the choices you\u2019re making, the person you\u2019re becoming. Keep trusting yourself. Keep being you. You\u2019re doing great, and I believe in you. Always have, always will. Love you, son.",
          spouse:
            "Hey love, I don\u2019t say this enough, but you\u2019re my person. You\u2019ve seen me at my best and my worst, and you\u2019re still here. That means everything to me. I love you. Even when you drive me crazy. Especially then, actually. You make life better, and I\u2019m grateful for you every single day.",
          grandchild:
            "Hey kiddo, I want you to know something really important. You are so, so loved. More than you could ever imagine. Whatever happens in life, wherever you go, whatever you do, remember that. You\u2019ve got people cheering for you, believing in you. And I\u2019m one of them. I love you so much, sweetheart.",
          friend:
            "My friend, I just want to say thank you. For being there, for listening, for making me laugh when I needed it most. You\u2019ve seen me through some stuff, and you never bailed. That\u2019s rare, and I don\u2019t take it for granted. You\u2019re one of the good ones. Love you, friend.",
          parent:
            "I don\u2019t say this enough, but thank you. For everything. For all the sacrifices you made, all the times you put me first, all the love you gave even when I didn\u2019t deserve it. I see it now, and I\u2019m so grateful. You shaped who I am, and I hope I make you proud. Love you so much.",
          default:
            "I want you to know you\u2019re special to me. Really special. And I\u2019m so glad you\u2019re in my life. Whatever happens, whatever you\u2019re going through, remember that you matter. You\u2019re loved. And I\u2019m always here for you. Always.",
        },
      },
      // ---------------------------------------------------------------
      // Prompt 19 — relationship
      // ---------------------------------------------------------------
      {
        id: 19,
        instruction:
          "Say goodnight to the person you\u2019re recording for. Speak softly, like they\u2019re falling asleep.",
        emotionalTone: "tender/intimate",
        lineType: "relationship",
        line: {
          daughter:
            "Sweetie, close your eyes. You\u2019re safe. Everything\u2019s okay. I\u2019m right here. You know what I used to do when you were tiny? I\u2019d just sit by your bed and watch you breathe. In and out, so peaceful. The whole world was chaotic and rushed and noisy, but right there? In that little room? Everything was perfectly still. That\u2019s how I want you to feel whenever you hear this. Peaceful. Protected. Loved. Goodnight, sweetheart. Sleep well.",
          son:
            "Hey buddy, settle in. You\u2019re okay. Everything\u2019s okay. When you were little, I used to sit right next to your bed after you\u2019d fallen asleep. Just watching you breathe, so calm and peaceful. The whole world outside was loud and chaotic, but in that room? Everything was still. I want you to feel that right now. Safe. Steady. Loved. Goodnight, son. Sleep well.",
          spouse:
            "Hey love, close your eyes. I\u2019m right here. You know what I think about sometimes? Those nights when we\u2019d just lie there talking about nothing until one of us drifted off. No agenda, no stress, just us. The world was quiet and everything felt exactly right. That\u2019s what I want you to feel right now. Calm. Warm. Loved. Goodnight, my love. Sleep well.",
          grandchild:
            "Okay little one, it\u2019s time to rest. Close your eyes. You\u2019re safe, you\u2019re warm, and you are so loved. You know what? When you sleep, I think the stars are watching over you. Every single one. And so am I, in my own way. So dream big, beautiful dreams. I\u2019ll be right here. Goodnight, sweetheart. I love you to the moon and back.",
          friend:
            "Hey friend, I know it\u2019s been a long day. Take a breath. Let it all go for a minute. You don\u2019t have to fix anything tonight. You don\u2019t have to be strong right now. Just rest. You\u2019ve done enough today. More than enough. I\u2019m proud of you, even if you don\u2019t feel like you earned it. You did. Goodnight, my friend. Rest easy.",
          parent:
            "Hey, it\u2019s me. I hope you\u2019re resting. You\u2019ve done so much \u2014 more than you probably realize. All those years of taking care of everyone else, I just want you to know: you can rest now. Close your eyes. Everything\u2019s okay. I\u2019m here, and I love you. More than I always say. Goodnight. Sleep well. I\u2019ll talk to you soon.",
          default:
            "Hey, close your eyes for a minute. Everything\u2019s okay. Whatever happened today, you made it through. And that\u2019s enough. You don\u2019t have to carry anything right now. Just breathe. Let everything get quiet. You\u2019re safe, you\u2019re cared for, and tomorrow\u2019s a fresh start. Goodnight. Sleep well. I\u2019m glad you\u2019re here.",
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
        line: "When I think about home, it\u2019s not really about a place. I mean, sure, I love {city}, but home is more than that. Home is where the people are. It\u2019s that feeling when you walk in and everything just feels right. It\u2019s where you can be yourself, completely, without any masks or pretending. That\u2019s home. And I\u2019m really lucky to have that.",
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
        line: "Here\u2019s something I wish someone had told me when I was younger. Be kind. To others, yes, but also to yourself. We\u2019re all doing the best we can with what we have. Nobody\u2019s perfect. We all mess up. And that\u2019s okay. So be patient with yourself. Give yourself the same grace you\u2019d give to someone you love. You deserve that too.",
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
        line: "Okay, let\u2019s count together. Ready? One, two, three, four, five, six, seven, eight, nine, ten. Good! Now let\u2019s go backwards. Ten, nine, eight, seven, six, five, four, three, two, one. Perfect! See? You\u2019re really good at this. Want to try it one more time?",
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
        line: "Just so you have my information: You can reach me at five-five-five, two-one-two, three-four-five-six. My address is four-twenty-seven Oak Street, apartment two-B, {city}. And today\u2019s date is March fifteenth, two thousand twenty-five, around three-thirty in the afternoon.",
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
        line: "You know what always makes me laugh? When everything goes wrong at once. Like, you spill your coffee, and then you slip on it, and then your phone rings and you grab it with your wet hand and it flies across the room, and the dog thinks it\u2019s a toy so now he\u2019s running off with it, and you\u2019re chasing the dog in your socks on a wet floor. And somehow nobody\u2019s around to see any of it. Or worse \u2014 everyone is. What do you even do at that point? You just have to stand there and laugh. Because life is ridiculous, and so are we.",
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
            "Alright sweetheart, that\u2019s everything. I love you so much. More than words can say. I\u2019m always here for you, always in your corner, always cheering for you. Whatever you need, whatever happens, you\u2019ve got me. Take care of yourself. I love you. Bye for now, kiddo.",
          son:
            "Okay buddy, I think we\u2019re done. I\u2019m proud of you. So incredibly proud. And I love you. Remember that when things get hard. You\u2019ve got people who believe in you, and I\u2019m at the top of that list. Take care, son. Love you. Talk soon.",
          spouse:
            "Alright love, that\u2019s it. I love you. You know that, right? Even when I don\u2019t say it enough, even when life gets crazy, I love you. You\u2019re my favorite person, my best friend, my everything. Always have been. Take care of yourself. I\u2019ll see you soon. Love you always.",
          grandchild:
            "Okay kiddo, that\u2019s all from me for now. Remember: You\u2019re so loved. So, so loved. Be good, have fun, and know you can always talk to me about anything. Anything at all. Love you to the moon and back, sweetheart. Bye for now!",
          friend:
            "Alright my friend, that\u2019s a wrap. Thanks for being you. Thanks for being in my life. You make everything better, and I hope you know that. Take care of yourself, okay? I\u2019ll talk to you soon. Love you, friend. Stay awesome. Bye!",
          parent:
            "Okay, I think that\u2019s everything. I love you. Thank you for everything you\u2019ve done for me, everything you\u2019ve taught me, all the ways you\u2019ve shaped who I am. I hope I make you proud. Take care of yourself. I\u2019ll call you soon. Love you so much. Bye.",
          default:
            "Alright, that\u2019s a wrap. Thank you for listening to all of this. I hope this brings you joy whenever you hear it. Remember you\u2019re loved, you\u2019re valued, and you\u2019re doing better than you think. Take care of yourself. Love you. Bye for now!",
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
      title: "\ud83c\udfc6 Congratulations!",
      body: "You did it! Your voice is fully trained and ready to create unlimited personalized messages.",
      progress: "100% Complete",
      cta: "Create Your First Message",
      celebration: "confetti",
    },
  },
];
