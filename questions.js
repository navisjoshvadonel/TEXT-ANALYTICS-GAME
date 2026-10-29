// ANALYSIS THE TEXTS — question bank
// Round 1: Picture Connect (15 questions, 3 per unit)
// Round 2: Hangman (25 questions, 5 per unit, non-overlapping)

const UNITS = {
  1: 'NLP Basics',
  2: 'Text Classification',
  3: 'Text Clustering',
  4: 'Topics & Recommendation',
  5: 'Web & Opinion Mining',
};

const CONNECT = [
  {
    id: 'C01',
    round: 'connection',
    unit: 1,
    topic: 'Basic NLP Techniques',
    answer: 'TOKENIZATION',
    difficulty: 'easy',
    tag: 'TEXT PROCESSING',
    tags: ['UNIT_1', 'TEXT_PROCESSING', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Scissors + sentence + separated word blocks',
    hint: 'Splitting a sentence into individual words and symbols'
  },
  {
    id: 'C02',
    round: 'connection',
    unit: 1,
    topic: 'Syntax & Phrases',
    answer: 'CHUNKING',
    difficulty: 'easy',
    tag: 'TEXT PROCESSING',
    tags: ['UNIT_1', 'TEXT_PROCESSING', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Puzzle pieces + grouped blocks',
    hint: 'Grouping words into short phrases like noun phrases'
  },
  {
    id: 'C03',
    round: 'connection',
    unit: 1,
    topic: 'Syntactic Analysis',
    answer: 'PARSING',
    difficulty: 'medium',
    tag: 'SYNTAX',
    tags: ['UNIT_1', 'SYNTAX', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Sentence + branching tree',
    hint: 'Analysing the grammatical structure of a sentence'
  },
  {
    id: 'C04',
    round: 'connection',
    unit: 2,
    topic: 'Decision Models',
    answer: 'DECISION TREE',
    difficulty: 'easy',
    tag: 'CLASSIFIER',
    tags: ['UNIT_2', 'CLASSIFIER', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Crossroads + tree branches + decision signs',
    hint: 'A flowchart-like model that splits on feature questions'
  },
  {
    id: 'C05',
    round: 'connection',
    unit: 2,
    topic: 'Probabilistic Classifiers',
    answer: 'NAIVE BAYES',
    difficulty: 'medium',
    tag: 'PROBABILITY',
    tags: ['UNIT_2', 'PROBABILITY', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Probability dice + classification folders',
    hint: 'Probabilistic classifier assuming feature independence'
  },
  {
    id: 'C06',
    round: 'connection',
    unit: 2,
    topic: 'Linear Classifiers',
    answer: 'LOGISTIC REGRESSION',
    difficulty: 'medium',
    tag: 'CLASSIFIER',
    tags: ['UNIT_2', 'CLASSIFIER', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'S-shaped curve + yes/no choices',
    hint: 'Uses an S-shaped sigmoid curve to predict a yes/no probability'
  },
  {
    id: 'C07',
    round: 'connection',
    unit: 3,
    topic: 'Unsupervised Grouping',
    answer: 'CLUSTERING',
    difficulty: 'easy',
    tag: 'UNSUPERVISED',
    tags: ['UNIT_3', 'UNSUPERVISED', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Scattered colored balls + organized groups',
    hint: 'Grouping similar items without predefined labels'
  },
  {
    id: 'C08',
    round: 'connection',
    unit: 3,
    topic: 'Centroid Clustering',
    answer: 'K MEANS',
    difficulty: 'medium',
    tag: 'ALGORITHM',
    tags: ['UNIT_3', 'ALGORITHM', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'K symbol + grouped dots + center targets',
    hint: 'Choose k, assign points to the nearest centre, move centres to the average, repeat'
  },
  {
    id: 'C09',
    round: 'connection',
    unit: 3,
    topic: 'Hierarchical Methods',
    answer: 'HIERARCHICAL CLUSTERING',
    difficulty: 'medium',
    tag: 'ALGORITHM',
    tags: ['UNIT_3', 'ALGORITHM', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Family tree + nested groups',
    hint: 'Repeatedly merges the closest groups, building a tree of nested groups'
  },
  {
    id: 'C10',
    round: 'connection',
    unit: 4,
    topic: 'Topic Models',
    answer: 'TOPIC MODELLING',
    difficulty: 'easy',
    tag: 'TOPICS',
    tags: ['UNIT_4', 'TOPICS', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Documents + different topic folders',
    hint: 'Discovering hidden themes across collections of documents'
  },
  {
    id: 'C11',
    round: 'connection',
    unit: 4,
    topic: 'Multimodal NLP',
    answer: 'IMAGE ANNOTATION',
    difficulty: 'easy',
    tag: 'MULTIMEDIA',
    tags: ['UNIT_4', 'MULTIMEDIA', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Photograph + descriptive labels',
    hint: 'Attaching descriptive labels or captions to pictures'
  },
  {
    id: 'C12',
    round: 'connection',
    unit: 4,
    topic: 'Recommender Systems',
    answer: 'COLLABORATIVE FILTERING',
    difficulty: 'medium',
    tag: 'RECOMMENDATION',
    tags: ['UNIT_4', 'RECOMMENDATION', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Friends + movie recommendations',
    hint: 'Recommends items liked by similar peers or users'
  },
  {
    id: 'C13',
    round: 'connection',
    unit: 5,
    topic: 'Link Analysis',
    answer: 'PAGERANK',
    difficulty: 'medium',
    tag: 'WEB MINING',
    tags: ['UNIT_5', 'WEB_MINING', 'MEDIUM', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Webpages + links + ranking podium',
    hint: 'Ranks web pages based on incoming link structure'
  },
  {
    id: 'C14',
    round: 'connection',
    unit: 5,
    topic: 'Sentiment & Opinions',
    answer: 'SENTIMENT ANALYSIS',
    difficulty: 'easy',
    tag: 'OPINION MINING',
    tags: ['UNIT_5', 'OPINION_MINING', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Happy/sad faces + customer reviews',
    hint: 'Finding out whether a review or tweet is positive, negative or neutral'
  },
  {
    id: 'C15',
    round: 'connection',
    unit: 5,
    topic: 'Text Insights',
    answer: 'TEXT VISUALIZATION',
    difficulty: 'easy',
    tag: 'VISUAL ANALYTICS',
    tags: ['UNIT_5', 'VISUAL_ANALYTICS', 'EASY', 'PICTURE_CONNECTION'],
    imageCount: 4,
    pictureIdea: 'Words + charts + word cloud',
    hint: 'Showing what a document collection says with word clouds and charts'
  }
];

// Round 2 — Hangman Question Bank (25 Questions, 5 per unit, non-overlapping with Round 1)
const HANGMAN = [
  // Unit I — NLP Basics
  { id: 'H01', round: 'hangman', unit: 1, answer: 'TOKEN', clue: 'A single word or symbol produced when text is split up', difficulty: 'easy' },
  { id: 'H02', round: 'hangman', unit: 1, answer: 'BIGRAM', clue: 'Sequence of two consecutive words', difficulty: 'easy' },
  { id: 'H03', round: 'hangman', unit: 1, answer: 'TRIGRAM', clue: 'Sequence of three consecutive words', difficulty: 'easy' },
  { id: 'H04', round: 'hangman', unit: 1, answer: 'SMOOTHING', clue: 'Gives unseen n-grams a small non-zero probability', difficulty: 'medium' },
  { id: 'H05', round: 'hangman', unit: 1, answer: 'HIDDEN MARKOV MODEL', clue: 'Sequence tagger with unobserved states, used for POS tagging', difficulty: 'medium' },

  // Unit II — Text Classification
  { id: 'H06', round: 'hangman', unit: 2, answer: 'CLASSIFICATION', clue: 'Assigning text to predefined categories', difficulty: 'easy' },
  { id: 'H07', round: 'hangman', unit: 2, answer: 'KNN', clue: 'Classifier that votes among the k closest labelled examples (abbreviation)', difficulty: 'easy' },
  { id: 'H08', round: 'hangman', unit: 2, answer: 'SUPPORT VECTOR MACHINE', clue: 'Classifier that finds the maximum-margin separating hyperplane', difficulty: 'medium' },
  { id: 'H09', round: 'hangman', unit: 2, answer: 'SUPERVISED LEARNING', clue: 'Approach where a model is taught with correctly labelled examples', difficulty: 'easy' },
  { id: 'H10', round: 'hangman', unit: 2, answer: 'TRAINING DATA', clue: 'Examples used to teach a model', difficulty: 'easy' },

  // Unit III — Text Clustering
  { id: 'H11', round: 'hangman', unit: 3, answer: 'CENTROID', clue: 'Central point representing a cluster', difficulty: 'easy' },
  { id: 'H12', round: 'hangman', unit: 3, answer: 'DENDROGRAM', clue: 'Tree diagram showing cluster relationships', difficulty: 'medium' },
  { id: 'H13', round: 'hangman', unit: 3, answer: 'SIMILARITY', clue: 'What cosine measures between two document vectors', difficulty: 'easy' },
  { id: 'H14', round: 'hangman', unit: 3, answer: 'CONNECTIVITY', clue: 'Linkage idea: points that are close together belong in the same cluster', difficulty: 'medium' },
  { id: 'H15', round: 'hangman', unit: 3, answer: 'DOCUMENT CLUSTER', clue: 'A group of similar texts found automatically', difficulty: 'easy' },

  // Unit IV — Topics & Recommendation
  { id: 'H16', round: 'hangman', unit: 4, answer: 'LDA', clue: 'Popular generative topic model, known by 3 letters (abbreviation)', difficulty: 'medium' },
  { id: 'H17', round: 'hangman', unit: 4, answer: 'PLSI', clue: 'Probabilistic version of latent semantic indexing (abbreviation)', difficulty: 'medium' },
  { id: 'H18', round: 'hangman', unit: 4, answer: 'LATENT TOPIC', clue: 'Hidden theme discovered in documents', difficulty: 'easy' },
  { id: 'H19', round: 'hangman', unit: 4, answer: 'TOPIC DISTRIBUTION', clue: 'The mix of themes in one text, e.g. 60% sport and 40% politics', difficulty: 'medium' },
  { id: 'H20', round: 'hangman', unit: 4, answer: 'DIRICHLET', clue: 'Probability distribution used as the prior in LDA', difficulty: 'medium' },

  // Unit V — Web & Opinion Mining
  { id: 'H21', round: 'hangman', unit: 5, answer: 'SUMMARIZATION', clue: 'Creating a shorter version of a document that keeps the key points', difficulty: 'easy' },
  { id: 'H22', round: 'hangman', unit: 5, answer: 'SENTIMENT POLARITY', clue: 'Whether an opinion is positive, negative or neutral', difficulty: 'easy' },
  { id: 'H23', round: 'hangman', unit: 5, answer: 'REVIEW MINING', clue: 'Extracting opinions and facts from customer feedback', difficulty: 'easy' },
  { id: 'H24', round: 'hangman', unit: 5, answer: 'ASPECT IDENTIFICATION', clue: 'Finding product features discussed in reviews', difficulty: 'medium' },
  { id: 'H25', round: 'hangman', unit: 5, answer: 'SOCIAL NETWORK', clue: 'Connected structure of users and relationships', difficulty: 'easy' },
];

module.exports = { UNITS, CONNECT, HANGMAN };
