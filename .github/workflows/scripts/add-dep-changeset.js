module.exports = ({ github, context }) => {
  const fs = require('fs');

  const content = `---
'prettier-plugin-astro': patch
---

Bump ${context.steps['dependabot-metadata'].outputs['dependency-names']}

${JSON.stringify(context.steps['dependabot-metadata'].outputs, null, 2)}
`;

  fs.writeFile(`./.changeset/${context.steps['dependabot-metadata'].outputs['dependency-names']}.md`, content, (err) => {
    if (err) {
      console.error(err);
      return;
    }
  });
};
