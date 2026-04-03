let block = 'geo\r\npoint: A\r\nvecteur: AB\r\n'; block = block.replace(/^([ \t]*vecteur:\\s*AB)[ \t]*$/gim, '$1, u'); console.log(JSON.stringify(block));
