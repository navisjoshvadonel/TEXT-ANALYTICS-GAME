// NLP QUEST Question Bank
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
    hint: 'Breaking text into smaller meaningful units'
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
    hint: 'Uses an S-shaped sigmoid curve to predict probabilities'
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
    hint: 'Partitions data into k groups around averaged cluster centers'
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
    hint: 'Builds nested groups shown as a tree or dendrogram'
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
    hint: 'Detecting positive, negative, or neutral sentiment in text'
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
    hint: 'Displaying textual data using charts, graphs, and word clouds'
  }
];

// Round 2 — Hangman Question Bank (25 Questions, 5 per unit, non-overlapping with Round 1)
const HANGMAN = [
  // Unit I — NLP Basics
  { id: 'H01', round: 'hangman', unit: 1, answer: 'TOKEN', clue: 'Smallest processing unit of text', difficulty: 'easy' },
  { id: 'H02', round: 'hangman', unit: 1, answer: 'BIGRAM', clue: 'Sequence of two consecutive words', difficulty: 'easy' },
  { id: 'H03', round: 'hangman', unit: 1, answer: 'TRIGRAM', clue: 'Sequence of three consecutive words', difficulty: 'easy' },
  { id: 'H04', round: 'hangman', unit: 1, answer: 'SMOOTHING', clue: 'Technique for handling unseen word sequences', difficulty: 'medium' },
  { id: 'H05', round: 'hangman', unit: 1, answer: 'HIDDEN MARKOV MODEL', clue: 'Probabilistic model using hidden states', difficulty: 'medium' },

  // Unit II — Text Classification
  { id: 'H06', round: 'hangman', unit: 2, answer: 'CLASSIFICATION', clue: 'Assigning text to predefined categories', difficulty: 'easy' },
  { id: 'H07', round: 'hangman', unit: 2, answer: 'KNN', clue: 'Algorithm using nearest data points', difficulty: 'easy' },
  { id: 'H08', round: 'hangman', unit: 2, answer: 'SUPPORT VECTOR MACHINE', clue: 'Classifier that finds a separating boundary', difficulty: 'medium' },
  { id: 'H09', round: 'hangman', unit: 2, answer: 'SUPERVISED LEARNING', clue: 'Learning using labelled training data', difficulty: 'easy' },
  { id: 'H10', round: 'hangman', unit: 2, answer: 'TRAINING DATA', clue: 'Examples used to teach a model', difficulty: 'easy' },

  // Unit III — Text Clustering
  { id: 'H11', round: 'hangman', unit: 3, answer: 'CENTROID', clue: 'Central point representing a cluster', difficulty: 'easy' },
  { id: 'H12', round: 'hangman', unit: 3, answer: 'DENDROGRAM', clue: 'Tree diagram showing cluster relationships', difficulty: 'medium' },
  { id: 'H13', round: 'hangman', unit: 3, answer: 'SIMILARITY', clue: 'Measure of how alike documents are', difficulty: 'easy' },
  { id: 'H14', round: 'hangman', unit: 3, answer: 'CONNECTIVITY', clue: 'Relationship between linked data points', difficulty: 'medium' },
  { id: 'H15', round: 'hangman', unit: 3, answer: 'DOCUMENT CLUSTER', clue: 'Group of similar text documents', difficulty: 'easy' },

  // Unit IV — Topics & Recommendation
  { id: 'H16', round: 'hangman', unit: 4, answer: 'LDA', clue: 'Topic model based on document-topic distributions', difficulty: 'medium' },
  { id: 'H17', round: 'hangman', unit: 4, answer: 'PLSI', clue: 'Probabilistic model of latent document topics', difficulty: 'medium' },
  { id: 'H18', round: 'hangman', unit: 4, answer: 'LATENT TOPIC', clue: 'Hidden theme discovered in documents', difficulty: 'easy' },
  { id: 'H19', round: 'hangman', unit: 4, answer: 'TOPIC DISTRIBUTION', clue: 'Probabilities of topics within a document', difficulty: 'medium' },
  { id: 'H20', round: 'hangman', unit: 4, answer: 'DIRICHLET', clue: 'Probability distribution used as a prior in LDA', difficulty: 'medium' },

  // Unit V — Web & Opinion Mining
  { id: 'H21', round: 'hangman', unit: 5, answer: 'SUMMARIZATION', clue: 'Creating a shorter version of a document', difficulty: 'easy' },
  { id: 'H22', round: 'hangman', unit: 5, answer: 'SENTIMENT POLARITY', clue: 'Positive, negative or neutral opinion', difficulty: 'easy' },
  { id: 'H23', round: 'hangman', unit: 5, answer: 'REVIEW MINING', clue: 'Extracting information from customer reviews', difficulty: 'easy' },
  { id: 'H24', round: 'hangman', unit: 5, answer: 'ASPECT IDENTIFICATION', clue: 'Finding product features discussed in reviews', difficulty: 'medium' },
  { id: 'H25', round: 'hangman', unit: 5, answer: 'SOCIAL NETWORK', clue: 'Connected structure of users and relationships', difficulty: 'easy' },
];

module.exports = { UNITS, CONNECT, HANGMAN };
