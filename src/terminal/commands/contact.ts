import { defineCommand } from '../core/types.js';

export default defineCommand({
  name:     'contact',
  describe: 'contact info',
  run() {
    return {
      type: 'echo',
      text: [
        'email:    evan.its.me@gmail.com',
        'github:   github.com/evansantos',
        'linkedin: linkedin.com/in/evandrosantos',
      ].join('\n'),
    };
  },
});
