import * as categoriesService from "./categories.service.js";

export const getCategories = async (req, res, next) => {
  try {
    const data = await categoriesService.getCategoryTree();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};