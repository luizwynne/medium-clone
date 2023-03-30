import { UserEntity } from "@app/user/user.entity";
import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeleteResult, getRepository, Repository } from "typeorm";
import { ArticleEntity } from "./article.entity";
import { CreateArticleDto } from "./dto/createArticle.dto";
import { ArticleResponseInterface } from "./types/articleResponse.interface";
import slugify from 'slugify'
import { UpdateArticleDto } from "./dto/updateArticle.dto";
import { ArticlesResponseInterface } from "./types/articlesresponse.interface";

@Injectable()
export class ArticleService {

    constructor(
        @InjectRepository(ArticleEntity) private readonly articleRepository: Repository<ArticleEntity>,
        @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>
    ){}

    async createArticle(currentUser: UserEntity, createArticleDto: CreateArticleDto): Promise<ArticleEntity>{
        const article = new ArticleEntity()
        Object.assign(article, createArticleDto)

        if(!article.tagList){
            article.tagList = []
        }

        article.slug = this.getSlug(createArticleDto.title)
        article.author = currentUser

        return await this.articleRepository.save(article)
    }

    buildArticleResponse(article: ArticleEntity): ArticleResponseInterface{
        return {article}    
    }

    private getSlug(title: string): string{
        return slugify(title, {lower: true}) + '-' + (Math.random() * Math.pow(36, 6))
    }

    async findBySlug(slug: string): Promise<ArticleEntity>{
        return await this.articleRepository.findOne({slug})
    }

    async deleteArticle(slug: string, currentUserId: number): Promise<DeleteResult> {

        const article = await this.findBySlug(slug)

        if(!article){
            throw new HttpException('Article not found', HttpStatus.NOT_FOUND)
        }

        if(article.author.id !== currentUserId){
            throw new HttpException('You are not an author', HttpStatus.FORBIDDEN)
        }

        return await this.articleRepository.delete({ slug })
    }

    async updateArticle(slug: string, updateArticleDto: UpdateArticleDto, currentUserId: number): Promise<ArticleEntity>{

        const article = await this.findBySlug(slug)

        if(!article){
            throw new HttpException('Article not found', HttpStatus.NOT_FOUND)
        }

        if(article.author.id !== currentUserId){
            throw new HttpException('You are not an author', HttpStatus.FORBIDDEN)
        }

        Object.assign(article, updateArticleDto)

        return await this.articleRepository.save(article)
    }

    async findAll(currentUserId: number, query: any): Promise<ArticlesResponseInterface> {
        const queryBuilder = getRepository(ArticleEntity)
                            .createQueryBuilder('articles')
                            .leftJoinAndSelect('articles.author', 'author')

        if (query.tag) {
            queryBuilder.andWhere(' :tag IN articles.tagList', {
                tag: `${query.tag}`,
            });
        }     
        
        if (query.author) {
            const author = await this.userRepository.findOne({
              username: query.author,
            });
            queryBuilder.andWhere('articles.authorId = :id', {
              id: author.id,
            });
        }

        if(query.favorited){
            const author = await this.userRepository.findOne(
                {username: query.favorite},
                {relations: ['favorites']}
            )
            const ids = author.favorites.map((el) => el.id)

            if(ids.length > 0){
                queryBuilder.andWhere('articles.authorId IN (:...ids)', { ids })
            }else{
                queryBuilder.andWhere('1 = 0')
            }

        }

        queryBuilder.orderBy('articles.createdAt', 'DESC')                    

        if (query.limit){
            queryBuilder.limit(query.limit);
        }
      
        if(query.offset){
            queryBuilder.offset(query.offset);
        }

        let favoriteIds: number[] = []

        if(currentUserId){
            const currentUser = await this.userRepository.findOne(currentUserId, {
                relations: ['favorites']
            })
            favoriteIds = currentUser.favorites.map(favorite => favorite.id)
        }

        const articles = await queryBuilder.getMany()
        const articlesWithFavorited = articles.map(article => {
            const favorited = favoriteIds.includes(article.id)
            return { ...article, favorited }
        })
        const articlesCount = await queryBuilder.getCount()
        
        return { articles: articlesWithFavorited, articlesCount }

    }

    async addArticleToFavorites(slug: string, currentUserId: number): Promise<ArticleEntity> {
        const article = await this.findBySlug(slug)
        const user = await this.userRepository.findOne(currentUserId, {
            relations: ['favorites'],
          });

        const notFavorited = user.favorites.findIndex((articleInFavorites) => articleInFavorites.id === article.id,
        ) === -1 // if the index returns -1 means that the article is not yet favorited

        if(notFavorited){
            user.favorites.push(article)
            article.favoritesCount ++
            await this.userRepository.save(user)
            await this.articleRepository.save(article)
        }

        return article
    }

    async deleteArticleFromFavorites(slug: string, currentUserId: number): Promise<ArticleEntity>{
        const article = await this.findBySlug(slug)
        const user = await this.userRepository.findOne(currentUserId, {
            relations: ['favorites'],
          });

        const articleIndex = user.favorites.findIndex((articleInFavorites) => articleInFavorites.id === article.id)

        if(articleIndex >= 0){
            user.favorites.splice(articleIndex, 1)
            article.favoritesCount --
            await this.userRepository.save(user)
            await this.articleRepository.save(article)
        }

        return article

    }

}