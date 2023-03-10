const {
  convertTimestampToDate,
  createRef,
  formatComments,
  checkArticleId,
  checkVotes,
  checkNewComment,
  validateComment,
  checkNewArticle,
  checkNewTopic,
} = require("../db/seeds/utils");

const { deleteComments } = require("../models/comments-models.js");
const { fetchArticles } = require("../models/articles-models.js");

describe("convertTimestampToDate", () => {
  test("returns a new object", () => {
    const timestamp = 1557572706232;
    const input = { created_at: timestamp };
    const result = convertTimestampToDate(input);
    expect(result).not.toBe(input);
    expect(result).toBeObject();
  });
  test("converts a created_at property to a date", () => {
    const timestamp = 1557572706232;
    const input = { created_at: timestamp };
    const result = convertTimestampToDate(input);
    expect(result.created_at).toBeDate();
    expect(result.created_at).toEqual(new Date(timestamp));
  });
  test("does not mutate the input", () => {
    const timestamp = 1557572706232;
    const input = { created_at: timestamp };
    convertTimestampToDate(input);
    const control = { created_at: timestamp };
    expect(input).toEqual(control);
  });
  test("ignores includes any other key-value-pairs in returned object", () => {
    const input = { created_at: 0, key1: true, key2: 1 };
    const result = convertTimestampToDate(input);
    expect(result.key1).toBe(true);
    expect(result.key2).toBe(1);
  });
  test("returns unchanged object if no created_at property", () => {
    const input = { key: "value" };
    const result = convertTimestampToDate(input);
    const expected = { key: "value" };
    expect(result).toEqual(expected);
  });
});

describe("createRef", () => {
  test("returns an empty object, when passed an empty array", () => {
    const input = [];
    const actual = createRef(input);
    const expected = {};
    expect(actual).toEqual(expected);
  });
  test("returns a reference object when passed an array with a single items", () => {
    const input = [{ title: "title1", article_id: 1, name: "name1" }];
    let actual = createRef(input, "title", "article_id");
    let expected = { title1: 1 };
    expect(actual).toEqual(expected);
    actual = createRef(input, "name", "title");
    expected = { name1: "title1" };
    expect(actual).toEqual(expected);
  });
  test("returns a reference object when passed an array with many items", () => {
    const input = [
      { title: "title1", article_id: 1 },
      { title: "title2", article_id: 2 },
      { title: "title3", article_id: 3 },
    ];
    const actual = createRef(input, "title", "article_id");
    const expected = { title1: 1, title2: 2, title3: 3 };
    expect(actual).toEqual(expected);
  });
  test("does not mutate the input", () => {
    const input = [{ title: "title1", article_id: 1 }];
    const control = [{ title: "title1", article_id: 1 }];
    createRef(input);
    expect(input).toEqual(control);
  });
});

describe("formatComments", () => {
  test("returns an empty array, if passed an empty array", () => {
    const comments = [];
    expect(formatComments(comments, {})).toEqual([]);
    expect(formatComments(comments, {})).not.toBe(comments);
  });
  test("converts created_by key to author", () => {
    const comments = [{ created_by: "ant" }, { created_by: "bee" }];
    const formattedComments = formatComments(comments, {});
    expect(formattedComments[0].author).toEqual("ant");
    expect(formattedComments[0].created_by).toBe(undefined);
    expect(formattedComments[1].author).toEqual("bee");
    expect(formattedComments[1].created_by).toBe(undefined);
  });
  test("replaces belongs_to value with appropriate id when passed a reference object", () => {
    const comments = [{ belongs_to: "title1" }, { belongs_to: "title2" }];
    const ref = { title1: 1, title2: 2 };
    const formattedComments = formatComments(comments, ref);
    expect(formattedComments[0].article_id).toBe(1);
    expect(formattedComments[1].article_id).toBe(2);
  });
  test("converts created_at timestamp to a date", () => {
    const timestamp = Date.now();
    const comments = [{ created_at: timestamp }];
    const formattedComments = formatComments(comments, {});
    expect(formattedComments[0].created_at).toEqual(new Date(timestamp));
  });
});

describe("checkVotes", () => {
  test("returns an object when validated", () => {
    const testVote = { inc_votes: 5 };

    expect(typeof checkVotes(testVote)).toEqual("object");
  });
  test("returns the votes object when it meets validation criteria", () => {
    const testVote = { inc_votes: 5 };

    expect(checkVotes(testVote)).toEqual({ inc_votes: 5 });
  });
  test("rejects the votes object if it doesn't have the inc_votes property", () => {
    const testVote = { lots_of_votes: 1234 };

    expect(checkVotes(testVote)).rejects.toEqual({
      status: 400,
      msg: "The request body must be structured as follows: { inc_votes: number_of_votes }",
    });
  });
  test("rejects the votes object if it doesn't have the a number for a value", () => {
    const testVote = { inc_votes: "String" };

    expect(checkVotes(testVote)).rejects.toEqual({
      status: 422,
      msg: "Votes must be an number!",
    });
  });
  test("rejects the votes object if it doesn't have the correct amount of properties", () => {
    const testVote = { inc_votes: 54, emoji: "smiley face" };
    expect(checkVotes(testVote)).rejects.toEqual({
      status: 422,
      msg: "The request body must be structured as follows: { inc_votes: number_of_votes }",
    });
  });
});

describe("checkNewComment", () => {
  test("returns an object when requirements met", () => {
    const input = { username: "bob", body: "im bob" };
    expect(typeof checkNewComment(input)).toBe("object");
  });
  test("checks if newComment has required properties, returns if true", () => {
    const input = { username: "bob", body: "im bob" };
    expect(checkNewComment(input)).toBe(input);
  });
  test("checks if newComment has required properties, rejects if false", () => {
    const input = { firstname: "bob", secondname: "henry" };
    expect(checkNewComment(input)).rejects.toEqual({
      status: 400,
      msg: 'Comment body must be: {username: "test-username", body:"test-body"}',
    });
  });
});

describe("checkArticleId", () => {
  test("only validates numbers", () => {
    const testId = 1;

    expect(typeof checkArticleId(testId)).toBe("number");
  });
  test("returns an articleId if it is validated", () => {
    const testId = 1;

    expect(checkArticleId(testId)).toBe(testId);
  });
  test("rejects an articleId if it is not a number", () => {
    const testId = "password123";

    expect(checkArticleId(testId)).rejects.toEqual({
      status: 400,
      msg: `Invalid Article ID: please try again`,
    });
  });
});

describe("validateComment", () => {
  test("rejects the comment_id if it is passed a value that isn't a number", () => {
    const testId = "string";
    expect(validateComment(testId)).rejects.toEqual({
      status: 400,
      msg: "Comment ID can only be in number format!",
    });
  });
  test("returns a valid comment_id", () => {
    const testId = 1;
    expect(validateComment(testId)).toBe(1);
  });
});

describe("checkNewArticle", () => {
  test("returns new article that has required properties", () => {
    const newArticle = {
      author: "icellusedkars",
      title: "I love celling used kars",
      body: "I just do, get over it",
      topic: "cats",
    };
    expect(checkNewArticle(newArticle)).toEqual(newArticle);
    expect(newArticle).toBeInstanceOf(Object);
    expect(Object.keys(newArticle).length).toBe(4);
    expect(newArticle).toHaveProperty("author", expect.any(String));
    expect(newArticle).toHaveProperty("title", expect.any(String));
    expect(newArticle).toHaveProperty("body", expect.any(String));
    expect(newArticle).toHaveProperty("topic", expect.any(String));
  });
  test("returns new article that has required properties and optional url img", () => {
    const newArticle = {
      author: "icellusedkars",
      title: "I love celling used kars",
      body: "I just do, get over it",
      topic: "cats",
      article_img_url: "www.my-pic-yes.com.org",
    };
    expect(checkNewArticle(newArticle)).toEqual(newArticle);
    expect(newArticle).toBeInstanceOf(Object);
    expect(Object.keys(newArticle).length).toBe(5);
    expect(newArticle).toHaveProperty("author", expect.any(String));
    expect(newArticle).toHaveProperty("title", expect.any(String));
    expect(newArticle).toHaveProperty("body", expect.any(String));
    expect(newArticle).toHaveProperty("topic", expect.any(String));
    expect(newArticle).toHaveProperty("article_img_url", expect.any(String));
  });
  test("new article rejects when incorrect properties in request", () => {
    const newArticle = {
      notauthor: "icellusedkars",
      title: "I love celling used kars",
      bodyimage: "I just do, get over it",
      topic: "cats",
      article_img_url: "",
    };
    expect(checkNewArticle(newArticle)).rejects.toEqual({
      status: 400,
      msg: "Article missing required information, or information inputted incorrectly",
    });
  });
  test("new article rejects when too many properties", () => {
    const newArticle = {
      notauthor: "icellusedkars",
      title: "I love celling used kars",
      bodyimage: "I just do, get over it",
      topic: "cats",
      date: "january 2023",
      time: "10:34",
    };
    expect(checkNewArticle(newArticle)).rejects.toEqual({
      status: 400,
      msg: "Article missing required information, or information inputted incorrectly",
    });
  });
});

describe("checkNewTopic", () => {
  test("returns the correct request", () => {
    const newTopic = {
      slug: "Sweets",
      description: "Welcome to the candy shop",
    };
    const actual = checkNewTopic(newTopic);
    const output = newTopic;

    expect(actual).toBeInstanceOf(Object);
    expect(actual).toEqual(output);
    expect(output).toMatchObject({
      slug: newTopic.slug,
      description: newTopic.description,
    });
  });
  test("rejects an empty object", () => {
    const newTopic = {};
    const actual = checkNewTopic(newTopic);

    expect(actual).rejects.toEqual({
      status: 404,
      msg: "Topic missing required fields, empty or incorrect",
    });
  });
  test("rejects an object with than two properties", () => {
    const newTopic = {
      slug: "Insects",
      description: "A bug's life",
      created_by: "Buggy_lady",
    };
    const actual = checkNewTopic(newTopic);
    expect(actual).rejects.toEqual({
      status: 404,
      msg: "Topic missing required fields, empty or incorrect",
    });
  });
  test("rejects an object without the two required properties", () => {
    const newTopic = {
      topic_title: "Insects",
      about: "A bug's life",
    };
    const actual = checkNewTopic(newTopic);

    expect(actual).rejects.toEqual({
      status: 404,
      msg: "Topic missing required fields, empty or incorrect",
    });
  });
});
