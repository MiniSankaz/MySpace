/**
 * Example Unit Test
 * Shows how to structure unit tests
 */

describe("Example Unit Test", () => {
  describe("Basic Math Operations", () => {
    it("should add two numbers correctly", () => {
      const result = 2 + 2;
      expect(result).toBe(4);
    });

    it("should multiply two numbers correctly", () => {
      const result = 3 * 4;
      expect(result).toBe(12);
    });
  });

  describe("String Operations", () => {
    it("should concatenate strings", () => {
      const firstName = "John";
      const lastName = "Doe";
      const fullName = `${firstName} ${lastName}`;
      expect(fullName).toBe("John Doe");
    });

    it("should convert to uppercase", () => {
      const text = "hello world";
      expect(text.toUpperCase()).toBe("HELLO WORLD");
    });
  });

  describe("Array Operations", () => {
    it("should filter even numbers", () => {
      const numbers = [1, 2, 3, 4, 5, 6];
      const evenNumbers = numbers.filter((n) => n % 2 === 0);
      expect(evenNumbers).toEqual([2, 4, 6]);
    });

    it("should map values", () => {
      const numbers = [1, 2, 3];
      const doubled = numbers.map((n) => n * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });
  });
});
