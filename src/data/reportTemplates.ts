export type Gender = "M" | "F";
export type Skill = "Reading" | "Listening" | "Speaking" | "Writing";

export type ScoreTemplate = {
  base: string;
  variations: string[];
};

export type SkillTemplates = {
  [score: number]: ScoreTemplate;
};

export type ReportTemplates = {
  skills: Record<Skill, SkillTemplates>;
  participation: { base: string; variations: string[] };
};

export const reportTemplates: ReportTemplates = {
  skills: {
    Reading: {
      1: {
        base: "{Name} is beginning to notice letters and sounds. With consistent practice, {pronoun} shows growing confidence in recognizing simple words.",
        variations: [
          "{Name} is starting to connect letters to sounds and recognizes simple words with support. With steady practice, {pronoun} gains confidence.",
          "{Name} shows early progress in letter-sound awareness and can identify some simple words. With regular practice, {pronoun} builds confidence."
        ]
      },
      2: {
        base: "{Name} recognizes common sight words and can decode short words. With guidance on blending, {pronoun} reads simple sentences more smoothly.",
        variations: [
          "{Name} can read familiar sight words and short decodable words. With more blending practice, {pronoun} reads simple sentences with better flow.",
          "{Name} reads short words and high-frequency terms accurately. With ongoing blending practice, {pronoun} improves sentence-level fluency."
        ]
      },
      3: {
        base: "{Name} is working hard on learning the alphabet and has started to recognize some letters and short words. With continued practice, {pronoun} reads simple texts with growing fluency.",
        variations: [
          "{Name} actively practices letter recognition and reads short words. As a result, {pronoun} shows steady growth in reading simple sentences.",
          "{Name} shows progress in recognizing letters and reading short words. With consistent practice, {pronoun} reads simple passages more smoothly."
        ]
      },
      4: {
        base: "{Name} reads grade-level sentences with increasing fluency and uses punctuation cues. With attention to phrasing, {pronoun} conveys meaning more clearly.",
        variations: [
          "{Name} reads at grade level with improving fluency and follows punctuation. With focus on phrasing, {pronoun} expresses meaning more clearly.",
          "{Name} maintains steady fluency on grade-level text and notices punctuation. With practice in phrasing, {pronoun} communicates meaning effectively."
        ]
      },
      5: {
        base: "{Name} reads with confident pacing and uses intonation to convey meaning. With occasional support on complex sentences, {pronoun} maintains strong comprehension.",
        variations: [
          "{Name} shows confident rhythm and intonation while reading. With light guidance on complex structures, {pronoun} sustains solid understanding.",
          "{Name} reads fluently with clear expression. With brief support on complex sentences, {pronoun} keeps comprehension strong."
        ]
      },
      6: {
        base: "{Name} reads complex texts with natural pacing and clear expression. {pronoun} infers meaning and maintains comprehension across paragraphs.",
        variations: [
          "{Name} handles complex texts with smooth pacing and expressive tone. {pronoun} infers meaning and keeps strong comprehension across sections.",
          "{Name} demonstrates natural fluency on challenging passages and conveys nuance well. {pronoun} sustains comprehension throughout."
        ]
      }
    },
    Listening: {
      1: {
        base: "{Name} listens to short instructions and follows simple tasks with support. With repetition, {pronoun} responds more confidently.",
        variations: [
          "{Name} attends to short directions and completes simple tasks with guidance. With repeated practice, {pronoun} answers more confidently.",
          "{Name} focuses on brief instructions and manages simple tasks with help. With consistent repetition, {pronoun} responds with growing confidence."
        ]
      },
      2: {
        base: "{Name} understands classroom routines and key phrases. With modeling, {pronoun} responds to familiar questions more independently.",
        variations: [
          "{Name} follows routines and recognizes key phrases. With clear models, {pronoun} answers familiar questions with increasing independence.",
          "{Name} recognizes classroom language and responds to routine prompts. With modeling, {pronoun} becomes more independent."
        ]
      },
      3: {
        base: "{Name} comprehends short dialogues and can identify main ideas. With guided practice, {pronoun} picks out key details more reliably.",
        variations: [
          "{Name} understands brief conversations and identifies central ideas. With guidance, {pronoun} notices key details more consistently.",
          "{Name} follows short exchanges and states the main point. With practice, {pronoun} captures important details."
        ]
      },
      4: {
        base: "{Name} follows multi-step instructions and understands classroom discussions. With attention to transitions, {pronoun} tracks ideas across turns.",
        variations: [
          "{Name} attends to multi-step directions and class talk. With focus on transitions, {pronoun} connects ideas across speakers.",
          "{Name} manages multi-step prompts and follows group discussion. With practice in linking points, {pronoun} tracks ideas well."
        ]
      },
      5: {
        base: "{Name} understands nuanced explanations and summarizes key points. {pronoun} asks clarifying questions when needed.",
        variations: [
          "{Name} grasps nuanced input and restates main ideas clearly. {pronoun} seeks clarification appropriately.",
          "{Name} comprehends layered information and highlights essentials. {pronoun} asks for clarity when helpful."
        ]
      },
      6: {
        base: "{Name} follows complex discourse and extracts relevant details. {pronoun} synthesizes information across sources.",
        variations: [
          "{Name} tracks complex talk and identifies pertinent details. {pronoun} integrates information across inputs.",
          "{Name} handles advanced listening and selects key details. {pronoun} synthesizes ideas effectively."
        ]
      }
    },
    Speaking: {
      1: {
        base: "{Name} uses simple words and short phrases to express needs. With modeling, {pronoun} repeats and practices clearly.",
        variations: [
          "{Name} expresses needs with basic words and short phrases. With models, {pronoun} practices clear repetition.",
          "{Name} communicates with simple vocabulary and brief phrases. With guidance, {pronoun} repeats accurately."
        ]
      },
      2: {
        base: "{Name} forms short sentences and participates with support. With pacing and pronunciation practice, {pronoun} speaks more clearly.",
        variations: [
          "{Name} speaks in short sentences and joins activities with help. With pacing and sound practice, {pronoun} gains clarity.",
          "{Name} constructs brief sentences and engages with guidance. With practice in pacing and sounds, {pronoun} improves clarity."
        ]
      },
      3: {
        base: "{Name} shares ideas in complete sentences and responds to prompts. With focus on ending sounds, {pronoun} speaks more confidently.",
        variations: [
          "{Name} communicates in full sentences and answers prompts. With attention to final sounds, {pronoun} builds confidence.",
          "{Name} expresses thoughts clearly and responds on topic. With sound awareness, {pronoun} gains confidence."
        ]
      },
      4: {
        base: "{Name} speaks with steady pacing and appropriate volume. With varied vocabulary, {pronoun} conveys ideas more precisely.",
        variations: [
          "{Name} maintains steady pace and suitable volume. With expanded vocabulary, {pronoun} shares ideas precisely.",
          "{Name} shows consistent pacing and clear volume. With broader vocabulary, {pronoun} expresses ideas accurately."
        ]
      },
      5: {
        base: "{Name} presents ideas clearly with natural rhythm and intonation. {pronoun} adapts language to context well.",
        variations: [
          "{Name} communicates with natural rhythm and expression. {pronoun} adjusts language to the situation effectively.",
          "{Name} delivers clear, expressive speech with strong rhythm. {pronoun} tailors language to context."
        ]
      },
      6: {
        base: "{Name} speaks confidently with nuanced expression and precise vocabulary. {pronoun} maintains coherence in extended talk.",
        variations: [
          "{Name} demonstrates confident, nuanced speech with precise terms. {pronoun} keeps coherence in longer responses.",
          "{Name} uses advanced expression and accurate vocabulary. {pronoun} sustains coherent delivery."
        ]
      }
    },
    Writing: {
      1: {
        base: "{Name} copies letters and writes simple words with support. With practice, {pronoun} forms letters more consistently.",
        variations: [
          "{Name} copies letters and writes basic words with guidance. With steady practice, {pronoun} forms letters consistently.",
          "{Name} writes simple words and practices letter formation. With repetition, {pronoun} builds consistency."
        ]
      },
      2: {
        base: "{Name} writes short sentences using common vocabulary. With feedback on spacing and punctuation, {pronoun} improves clarity.",
        variations: [
          "{Name} composes brief sentences with familiar words. With focus on spacing and marks, {pronoun} gains clarity.",
          "{Name} creates short sentences using common terms. With attention to spacing and punctuation, {pronoun} improves clarity."
        ]
      },
      3: {
        base: "{Name} organizes ideas into simple paragraphs and uses transition words. With revision, {pronoun} strengthens structure and clarity.",
        variations: [
          "{Name} arranges ideas into basic paragraphs with transitions. With revision, {pronoun} improves structure and clarity.",
          "{Name} writes simple paragraphs and uses linking words. With editing, {pronoun} enhances clarity."
        ]
      },
      4: {
        base: "{Name} writes with clear structure and varied sentences. With precise vocabulary, {pronoun} conveys meaning effectively.",
        variations: [
          "{Name} composes with solid structure and sentence variety. With accurate word choice, {pronoun} communicates effectively.",
          "{Name} maintains clear organization and varied sentence forms. With precise terms, {pronoun} conveys meaning well."
        ]
      },
      5: {
        base: "{Name} develops ideas with cohesive paragraphs and appropriate tone. {pronoun} revises for clarity and impact.",
        variations: [
          "{Name} builds cohesive paragraphs with fitting tone. {pronoun} refines writing for clarity and effect.",
          "{Name} expands ideas in well-structured paragraphs and keeps tone appropriate. {pronoun} revises effectively."
        ]
      },
      6: {
        base: "{Name} writes with confident voice, logical flow, and precise language. {pronoun} sustains coherence across sections.",
        variations: [
          "{Name} shows confident voice and logical organization with precise language. {pronoun} keeps coherence across parts.",
          "{Name} maintains strong voice, clear flow, and accurate word choice. {pronoun} sustains coherence."
        ]
      }
    }
  },
  participation: {
    base: "{Name} participates actively in class, follows routines, and engages with peers. {pronoun} shows steady effort and growth each week.",
    variations: [
      "{Name} engages in class activities, follows routines, and collaborates well. {pronoun} shows steady effort and weekly growth.",
      "{Name} takes part in class consistently, follows routines, and works well with peers. {pronoun} demonstrates steady progress."
    ]
  }
};

