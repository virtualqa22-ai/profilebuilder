
describe("Authentication", () => {
  it("should allow a user to sign in and out", () => {
    cy.visit("/auth/signin");
    cy.get("input[name=email]").type("test@example.com");
    cy.get("input[name=password]").type("password");
    cy.get("button[type=submit]").click();
    cy.url().should("include", "/");
    cy.contains("J Smith").click();
    cy.url().should("include", "/profile");
    cy.contains("Sign Out").click();
    cy.url().should("include", "/");
    cy.contains("Sign In");
  });

  it("should navigate to the profile and settings pages", () => {
    cy.visit("/auth/signin");
    cy.get("input[name=email]").type("test@example.com");
    cy.get("input[name=password]").type("password");
    cy.get("button[type=submit]").click();
    cy.contains("J Smith").click();
    cy.url().should("include", "/profile");
    cy.contains("Settings").click();
    cy.url().should("include", "/settings");
  });

  it("should require authentication to access the resumes page", () => {
    cy.visit("/resumes");
    cy.contains("Please sign in to manage your resumes.");
    cy.contains("Sign In").click();
    cy.url().should("include", "/auth/signin");
  });
});
