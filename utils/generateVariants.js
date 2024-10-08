// Function to generate all variant combinations based on options
const generateVariants = (options) => {
    const generateCombinations = (options, index = 0, currentVariant = []) => {
      if (index === options.length) {
        return [currentVariant];
      }
  
      const optionValues = options[index].values;
      const variants = [];
  
      for (const value of optionValues) {
        const newVariant = [...currentVariant, value];
        variants.push(...generateCombinations(options, index + 1, newVariant));
      }
  
      return variants;
    };
  
    return generateCombinations(options);
  };

  module.exports=generateVariants;