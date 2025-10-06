import React from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './App.css';
import { useEffect, useMemo, useState } from 'react';
import { Meal, MealSummary, filterByArea, filterByCategory, getIngredientList, listAllAreas, listAllCategories, lookupMealById, searchMealsByName } from './api';

function App() {
  return (
    <div className="App">
      <nav className="topnav">
        <NavLink to="/" end>List</NavLink>
        <NavLink to="/gallery">Gallery</NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<ListView />} />
          <Route path="/gallery" element={<GalleryView />} />
          <Route path="/detail/:id" element={<DetailView />} />
        </Routes>
      </main>
    </div>
  );
}

function ListView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q') ?? '';
  const sortBy = (searchParams.get('sort') ?? 'name') as 'name' | 'id';
  const sortOrder = (searchParams.get('order') ?? 'asc') as 'asc' | 'desc';

  useEffect(() => {
    if (!query) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    let ignore = false;
    setLoading(true);
    setError(null);
    // search meals by name only when query is provided
    searchMealsByName(query)
      .then((meals: Meal[]) => {
        if (!ignore) setItems(meals.map((m: Meal) => ({ idMeal: m.idMeal, strMeal: m.strMeal, strMealThumb: m.strMealThumb })));
      })
      .catch((e: any) => {
        if (!ignore) setError('Failed to load list');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [query]);

  const filteredSorted = useMemo(() => {
    const withId = items.map((it) => ({ ...it, id: Number(it.idMeal) }));
    const filtered = query ? withId : withId;
    const sorted = [...filtered].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') {
        return a.strMeal.localeCompare(b.strMeal) * dir;
      }
      return (a.id - b.id) * dir;
    });
    return sorted;
  }, [items, query, sortBy, sortOrder]);

  useEffect(() => {
    const seq = filteredSorted.map((x: any) => String(x.idMeal));
    sessionStorage.setItem('mealSequence', JSON.stringify(seq));
  }, [filteredSorted]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="listPage">
      <h1 className="pageTitle">Recipe Wiki</h1>
      <div className="controlsFrame">
        <div className="controlsStack">
          <input
            type="search"
            className="searchBar"
            placeholder="Search by meal name..."
            value={query}
            onChange={(e) => updateParam('q', e.target.value)}
          />
          <div className="filterRow">
            <label className="filterLabel">Sort by</label>
            <select className="filterSelect" value={sortBy} onChange={(e) => updateParam('sort', e.target.value)}>
              <option value="name">Name</option>
              <option value="id">ID</option>
            </select>
            <label className="filterLabel">Order</label>
            <select className="filterSelect" value={sortOrder} onChange={(e) => updateParam('order', e.target.value)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p>{error}</p>}
      {!query && !loading && !error && (
        <div className="emptyState">Please search</div>
      )}
      {query && (
        <div className="listStack">
          {filteredSorted.map((it) => (
            <div key={it.idMeal} className="listItem">
              <img className="listItemImage" src={it.strMealThumb} alt={it.strMeal} />
              <div className="listItemContent">
                <p className="listItemTitle">{it.strMeal}</p>
                <p className="listItemId">ID: {(it as any).id}</p>
              </div>
              <Link className="btnViolet" to={`/detail/${it.idMeal}`}>Details</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryView() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeAreas, setActiveAreas] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allAreas, setAllAreas] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [cats, areas] = await Promise.all([listAllCategories(), listAllAreas()]);
        if (!ignore) {
          setAllCategories(cats);
          setAllAreas(areas);
        }
      } catch (e) {
        if (!ignore) setError('Failed to load gallery');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    async function refetch() {
      setLoading(true);
      try {
        if (activeCategories.length === 0 && activeAreas.length === 0) {
          // When no filters, show all items by fetching all categories
          const promises = allCategories.map((c) => filterByCategory(c));
          const lists = await Promise.all(promises);
          const merged: Record<string, MealSummary> = {};
          lists.flat().forEach((m) => { merged[m.idMeal] = m; });
          if (!ignore) setItems(Object.values(merged));
        } else {
          // Combine category and area filters
          const promises: Promise<MealSummary[]>[] = [];
          activeCategories.forEach((c) => promises.push(filterByCategory(c)));
          activeAreas.forEach((a) => promises.push(filterByArea(a)));
          
          const lists = await Promise.all(promises);
          const merged: Record<string, MealSummary> = {};
          lists.flat().forEach((m) => { merged[m.idMeal] = m; });
          if (!ignore) setItems(Object.values(merged));
        }
      } catch (e) {
        if (!ignore) setError('Failed to apply filters');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    refetch();
    return () => { ignore = true; };
  }, [activeCategories, activeAreas, allCategories]);

  useEffect(() => {
    const seq = items.map((m) => String(m.idMeal));
    sessionStorage.setItem('mealSequence', JSON.stringify(seq));
  }, [items]);

  function toggleCategory(c: string) {
    setActiveCategories((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  }

  function toggleArea(a: string) {
    setActiveAreas((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }

  return (
    <div className="galleryPage">
      <h1 className="pageTitle">Gallery</h1>
      <div className="galleryFiltersContainer">
        <div className="filterSubdiv">
          <h3 className="filterSubdivTitle">Filter by Main Categories</h3>
          <div className="chips">
            {allCategories.map((c) => (
              <button
                key={c}
                className={`chip${activeCategories.includes(c) ? ' active' : ''}`}
                onClick={() => toggleCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="filterSubdiv">
          <h3 className="filterSubdivTitle">Filter by Area</h3>
          <div className="areaChips">
            {allAreas.map((a) => (
              <button
                key={a}
                className={`chip${activeAreas.includes(a) ? ' active' : ''}`}
                onClick={() => toggleArea(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      {loading && <p>Loading…</p>}
      {error && <p>{error}</p>}
      <div className="galleryGrid">
        {items.map((m) => (
          <div key={m.idMeal} className="galleryCard" onClick={() => navigate(`/detail/${m.idMeal}`)}>
            <img className="galleryImage" src={m.strMealThumb} alt={m.strMeal} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mealId = String(id || '');
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mealId) return;
    let ignore = false;
    setLoading(true);
    setError(null);
    lookupMealById(mealId)
      .then((m) => { if (!ignore) setMeal(m); })
      .catch(() => { if (!ignore) setError('Failed to load details'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [mealId]);

  const sequence: string[] = JSON.parse(sessionStorage.getItem('mealSequence') || '[]');
  const idx = sequence.indexOf(mealId);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < sequence.length - 1;
  function prev() { if (hasPrev) navigate(`/detail/${sequence[idx - 1]}`); }
  function next() { if (hasNext) navigate(`/detail/${sequence[idx + 1]}`); }

  return (
    <div className="detailPage">
      <h1 className="pageTitle">Recipe Details</h1>
      {loading && <p>Loading…</p>}
      {error && <p>{error}</p>}
      {meal && (
        <div className="detailContainer">
          <h2 className="detailMealTitle">{meal.strMeal}</h2>
          <p className="detailCategoryArea">Category: {meal.strCategory || '—'} | Area: {meal.strArea || '—'}</p>
          <img className="detailImage" src={meal.strMealThumb} alt={meal.strMeal} />
          <p className="detailMealId">ID: {meal.idMeal}</p>
          
          <h3 className="detailSectionTitle">Ingredients</h3>
          <ul className="detailIngredientsList">
            {getIngredientList(meal).map((x) => (
              <li key={x.ingredient}>{x.ingredient} — {x.measure}</li>
            ))}
          </ul>
          
          <h3 className="detailSectionTitle">Instructions</h3>
          <ul className="detailInstructionsList">
            {meal.strInstructions?.replace(/(\d+\.\s*)/g, '@@@$1').split('@@@').filter(Boolean).map((step, index) => (
              <li key={index}>{step.trim()}</li>
            ))}
          </ul>
          
          <div className="detailNavButtons">
            <button onClick={prev} disabled={!hasPrev} className="btnViolet">Previous</button>
            <button onClick={next} disabled={!hasNext} className="btnViolet">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
