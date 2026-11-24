// Hook to fetch Category → Sub‑Category → Item hierarchy from the backend API
// Returns sorted arrays (by sort_order, then name) and a loading flag.
import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";

export const useHierarchy = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHierarchy = async () => {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      const [catRes, subRes, itmRes] = await Promise.all([
        fetch(`${API_BASE}/categories`, { headers, credentials: "include" }).then((res) => res.json()),
        fetch(`${API_BASE}/subcategories`, { headers, credentials: "include" }).then((res) => res.json()),
        fetch(`${API_BASE}/items`, { headers, credentials: "include" }).then((res) => res.json()),
      ]);

      const sortFn = (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name || "").localeCompare(b.name || "");

      const catData = Array.isArray(catRes?.data) ? catRes.data : [];
      const subData = Array.isArray(subRes?.data) ? subRes.data : [];
      const itmData = Array.isArray(itmRes?.data) ? itmRes.data : [];

      setCategories(catData.sort(sortFn));
      setSubCategories(subData.sort(sortFn));
      setItems(itmData.sort(sortFn));
    } catch (e) {
      console.error("Failed to load hierarchy", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  return { categories, subCategories, items, loading, refreshHierarchy: fetchHierarchy };
};
