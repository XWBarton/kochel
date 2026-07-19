enum LoadState<T> {
    case loading
    case loaded(T)
    case failed(String)
}
